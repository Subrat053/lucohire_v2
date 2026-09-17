const BaseConnector = require('../BaseConnector');
const CompanyMaster = require('../../../models/CompanyMaster');

class YCombinatorConnector extends BaseConnector {
  constructor() {
    super('ycombinator', 3); // Type 3: Registry
  }

  async fetch(options) {
    console.log(`[Connector:${this.name}] Fetching Top YCombinator Startups...`);
    
    // In a real scenario, this might hit an API or scrape YC top companies.
    // Here we use a highly curated list of actual top YC/Startup companies
    // that have robust career pages for testing the generic custom scraper.
    const topStartups = [
      'Stripe', 'Airbnb', 'Coinbase', 'Instacart', 'DoorDash', 
      'Twitch', 'Cruise', 'Reddit', 'Plaid', 'Brex', 
      'GitLab', 'Rippling', 'Deel', 'Figma', 'Scale AI',
      'OpenAI', 'Anthropic', 'Notion', 'Canva', 'Vercel'
    ];

    return topStartups.map(name => ({
      name,
      domain: name.toLowerCase().replace(/ /g, '') + '.com',
      status: 'Active',
      location: 'San Francisco, CA',
      industry: 'Technology',
      ycBatch: 'W' + (Math.floor(Math.random() * 10) + 12) // mock batch
    }));
  }

  async parse(rawData, options) {
    return rawData.map(row => {
      return {
        companyName: row.name,
        externalId: 'YC_' + row.domain,
        source: this.name,
        status: row.status === 'Active' ? 'active' : 'inactive',
        countryCode: 'US',
        location: row.location,
        industry: row.industry,
        isActive: row.status === 'Active'
      };
    });
  }

  async filter(parsedData, options) {
    return parsedData.filter(company => company.status === 'active');
  }

  async upsert(filteredData, options) {
    const bulkOps = filteredData.map(company => ({
      updateOne: {
        filter: { externalId: company.externalId, source: this.name },
        update: { 
          $set: {
            ...company,
            lastSyncedAt: options.syncStartTime || new Date()
          } 
        },
        upsert: true
      }
    }));

    if (bulkOps.length > 0) {
      const result = await CompanyMaster.bulkWrite(bulkOps);
      this.stats.inserted += (result.upsertedCount || 0);
      this.stats.updated += (result.modifiedCount || 0);
      this.stats.skipped += ((result.matchedCount || 0) - (result.modifiedCount || 0));
    }
  }
}

module.exports = YCombinatorConnector;
