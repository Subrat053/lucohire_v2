const SyncLog = require('../../models/SyncLog');
const CompanySource = require('../../models/CompanySource');
const RecruiterLead = require('../../models/RecruiterLead');

/**
 * Universal BaseConnector Framework
 * Every data source (Job API, ATS, Registry, Contact) must extend this class.
 */
class BaseConnector {
  constructor(name, type) {
    if (!name || !type) throw new Error("Connector must have a name and type");
    this.name = name; // e.g. 'adzuna', 'greenhouse', 'mca_india'
    this.type = type; // e.g. 1 (Job API), 2 (ATS API), 3 (Registry), 3.5 (Crawler), 4 (Contact)
    
    this.stats = {
      totalFetched: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };
  }

  /**
   * 1. Get raw data from the source (API call, or direct file download)
   * Must handle its own pagination if applicable.
   * @param {Object} options - e.g. { countryCode, keyword, companySlug }
   * @returns {Array|Object} Raw data from source
   */
  async fetch(options) {
    throw new Error("fetch() must be implemented by subclass");
  }

  /**
   * 2. Turn raw JSON/CSV/XLSX into our normalized internal format
   * @param {Array|Object} rawData 
   * @param {Object} options
   * @returns {Array} Array of normalized objects
   */
  async parse(rawData, options) {
    throw new Error("parse() must be implemented by subclass");
  }

  /**
   * 3. Keep only what we want (e.g. status=active, or country=X)
   * @param {Array} parsedData 
   * @param {Object} options
   * @returns {Array} Array of filtered normalized objects
   */
  async filter(parsedData, options) {
    // Default: return everything if no specific filter is needed
    return parsedData;
  }

  /**
   * 4. Insert new / update changed / skip unchanged, into the right table
   * @param {Array} filteredData 
   * @param {Object} options 
   */
  async upsert(filteredData, options) {
    throw new Error("upsert() must be implemented by subclass");
  }

  /**
   * Core orchestrator method. Wraps fetch/parse/filter/upsert in try/catch and logs to SyncLog.
   * @param {Object} options 
   */
  async run(options = {}) {
    if (String(process.env.ENABLE_CONNECTORS || '').toLowerCase() !== 'true') {
      return { ...this.stats, disabled: true };
    }
    const syncStartTime = new Date();
    console.log(`[Connector:${this.name}] Starting run for ${JSON.stringify(options)}`);
    
    // Create initial ingestion log (shared logger table mapping)
    const logEntry = await SyncLog.create({
      syncType: this.type === 2 ? 'ats' : (this.type === 3 || this.type === 3.5) ? 'company_discovery' : 'global_source',
      source: this.name,
      countryCode: options.countryCode || 'GLOBAL',
      status: 'partial',
      startedAt: syncStartTime
    });

    try {
      // 1. Fetch
      console.log(`[Connector:${this.name}] Fetching...`);
      const rawData = await this.fetch(options);
      
      // 2. Parse
      console.log(`[Connector:${this.name}] Parsing...`);
      const parsedData = await this.parse(rawData, options);
      
      // 3. Filter
      console.log(`[Connector:${this.name}] Filtering...`);
      const filteredData = await this.filter(parsedData, options);

      this.stats.totalFetched = filteredData.length;

      // 4. Upsert
      console.log(`[Connector:${this.name}] Upserting ${filteredData.length} records...`);
      await this.upsert(filteredData, { ...options, syncStartTime });

      // Mark success
      logEntry.status = 'success';
      logEntry.completedAt = new Date();
      logEntry.jobsFetched = this.stats.totalFetched;
      logEntry.jobsInserted = this.stats.inserted;
      logEntry.jobsUpdated = this.stats.updated;
      logEntry.duplicatesSkipped = this.stats.skipped;
      
      await logEntry.save();
      console.log(`[Connector:${this.name}] Run completed successfully.`);

      return this.stats;

    } catch (err) {
      console.error(`[Connector:${this.name}] Run failed:`, err.message);
      this.stats.errors++;
      
      logEntry.status = 'failed';
      logEntry.completedAt = new Date();
      logEntry.errorMessage = err.message;
      await logEntry.save();
      
      // We log but do not bubble up the error to prevent crashing other scheduled tasks
      return this.stats;
    }
  }
}

module.exports = BaseConnector;
