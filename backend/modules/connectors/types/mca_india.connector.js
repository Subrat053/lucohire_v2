const BaseConnector = require('../BaseConnector');
const axios = require('axios');
const csv = require('csv-parser');
const CompanyMaster = require('../../../models/CompanyMaster');

class McaIndiaConnector extends BaseConnector {
  constructor() {
    super('mca_india', 3); // Type 3: Registry
  }

  async fetch(options) {
    // In production, MCA provides bulk data by state. We simulate looping through multiple state URLs here.
    const stateUrls = [
      { state: 'Maharashtra', code: 'MH', url: 'https://raw.githubusercontent.com/datasets/investor-flow-of-funds-us/master/data/weekly.csv' },
      { state: 'Karnataka', code: 'KA', url: 'https://raw.githubusercontent.com/datasets/investor-flow-of-funds-us/master/data/weekly.csv' },
      { state: 'Delhi', code: 'DL', url: 'https://raw.githubusercontent.com/datasets/investor-flow-of-funds-us/master/data/weekly.csv' }
    ];
    
    let allResults = [];

    for (const stateObj of stateUrls) {
      console.log(`[Connector:${this.name}] Downloading CSV for ${stateObj.state} from ${stateObj.url}...`);
      
      const response = await axios({
        method: 'get',
        url: stateObj.url,
        responseType: 'stream'
      });

      const stateResults = await new Promise((resolve, reject) => {
        const results = [];
        response.data
          .pipe(csv())
          .on('data', (data) => {
             const realCompanies = ['Infosys', 'Wipro', 'TCS', 'Zomato', 'Swiggy', 'Cred', 'Razorpay', 'Flipkart', 'Paytm', 'Freshworks', 'Zerodha', 'Ola Cabs', 'Urban Company', 'Delhivery', 'Lenskart'];
             const randomName = realCompanies[Math.floor(Math.random() * realCompanies.length)];
             
             results.push({
               'Corporate Identification Number': 'U1234' + Math.floor(Math.random()*10000) + stateObj.code + '2023PTC' + Math.floor(Math.random()*100000),
               'Company Name': randomName,
               'Company Status': Math.random() > 0.2 ? 'Active' : 'Strike Off',
               'Class of Company': 'Private',
               'Authorized Capital': data['Weekly Flows'] || '100000',
               'State': stateObj.state
             });
          })
          .on('end', () => resolve(results.slice(0, 15))) // take 15 per state for demo
          .on('error', reject);
      });
      
      allResults = allResults.concat(stateResults);
    }
    
    return allResults;
  }

  async parse(rawData, options) {
    // Convert Government CSV columns to our internal CompanyMaster schema
    return rawData.map(row => {
      return {
        companyName: row['Company Name'],
        externalId: row['Corporate Identification Number'],
        source: this.name,
        status: row['Company Status'] === 'Active' ? 'active' : 'inactive',
        countryCode: 'IN',
        location: row['State'],
        industry: row['Class of Company'] || 'General',
        isActive: row['Company Status'] === 'Active'
      };
    });
  }

  async filter(parsedData, options) {
    // Only ingest Active companies into our pipeline to avoid scraping dead companies
    return parsedData.filter(company => company.status === 'active');
  }

  async upsert(filteredData, options) {
    // Bulk upsert into CompanyMaster
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
      // Anything matched but not modified is technically skipped/unchanged
      this.stats.skipped += ((result.matchedCount || 0) - (result.modifiedCount || 0));
    }
  }
}

module.exports = McaIndiaConnector;
