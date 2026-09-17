const BaseConnector = require('../BaseConnector');
const axios = require('axios');
const CompanyContact = require('../../../models/CompanyContact');

class ContactEnricherConnector extends BaseConnector {
  constructor() {
    super('contact_enricher', 4); // Type 4: Contact/Enrichment Tools
  }

  /**
   * Fetch contacts for a specific company domain.
   * Expected options: { companyId: ObjectId, companyDomain: 'stripe.com' }
   */
  async fetch(options) {
    if (!options.companyId || !options.companyDomain) {
      throw new Error("ContactEnricherConnector requires 'companyId' and 'companyDomain' in options.");
    }
    
    // In production, this would call Hunter.io API or run the career-page crawler's regex
    // e.g. axios.get(`https://api.hunter.io/v2/domain-search?domain=${options.companyDomain}&api_key=XXX`)
    
    console.log(`[Connector:${this.name}] Fetching contacts for domain: ${options.companyDomain}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulated API response (mock Hunter.io response)
    const simulatedEmails = [
      { value: `careers@${options.companyDomain}`, type: 'generic', confidence: 95 },
      { value: `hr@${options.companyDomain}`, type: 'generic', confidence: 80 },
      { value: `john.doe@${options.companyDomain}`, type: 'personal', confidence: 45 }
    ];

    return {
      companyId: options.companyId,
      companyDomain: options.companyDomain,
      emails: simulatedEmails
    };
  }

  async parse(rawData, options) {
    // rawData is the single object returned by fetch()
    const { companyId, companyDomain, emails } = rawData;

    return emails.map(emailObj => ({
      companyId: companyId,
      companyDomain: companyDomain,
      email: emailObj.value,
      sourcePage: `https://${companyDomain}/contact`,
      confidenceScore: emailObj.confidence,
      source: this.name,
      isActive: true
    }));
  }

  async filter(parsedData, options) {
    // Only keep high confidence emails for our CRM (e.g., score >= 70)
    // and must be valid email format (basic regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    return parsedData.filter(contact => {
      return contact.confidenceScore >= 70 && emailRegex.test(contact.email);
    });
  }

  async upsert(filteredData, options) {
    // Type 4 connectors write to company_contacts (CompanyContact model)
    // Dedupe key: companyId + email
    
    const bulkOps = filteredData.map(contact => ({
      updateOne: {
        filter: { companyId: contact.companyId, email: contact.email },
        update: { 
          $set: {
            ...contact,
            lastVerifiedAt: options.syncStartTime || new Date()
          } 
        },
        upsert: true
      }
    }));

    if (bulkOps.length > 0) {
      const result = await CompanyContact.bulkWrite(bulkOps);
      this.stats.inserted += (result.upsertedCount || 0);
      this.stats.updated += (result.modifiedCount || 0);
      this.stats.skipped += ((result.matchedCount || 0) - (result.modifiedCount || 0));
    }
  }
}

module.exports = ContactEnricherConnector;
