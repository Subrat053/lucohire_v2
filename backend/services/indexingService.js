const { JWT } = require('google-auth-library');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Service to handle Google Indexing API requests.
 * Requires GOOGLE_APPLICATION_CREDENTIALS environment variable.
 */
class IndexingService {
  constructor() {
    this.keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS; // e.g. path to service-account.json or raw JSON
    this.isConfigured = !!this.keyFile;
    this.jwtClient = null;

    if (this.isConfigured) {
      try {
        let credentials;
        // Check if it's a JSON string or a file path
        if (this.keyFile.startsWith('{')) {
          credentials = JSON.parse(this.keyFile);
        } else {
          credentials = require('path').resolve(this.keyFile);
          credentials = require(credentials);
        }
        
        this.jwtClient = new JWT({
          email: credentials.client_email,
          key: credentials.private_key,
          scopes: ['https://www.googleapis.com/auth/indexing']
        });
      } catch (err) {
        console.error('[IndexingService] Initialization failed:', err.message);
        this.isConfigured = false;
      }
    }
  }

  /**
   * Notifies Google Indexing API about a URL update or deletion.
   * @param {string} url - The URL to be indexed/removed.
   * @param {string} action - 'URL_UPDATED' or 'URL_DELETED'
   */
  async notifyGoogle(url, action = 'URL_UPDATED') {
    if (!this.isConfigured || !this.jwtClient) {
      console.log(`[IndexingService] Skipping ${action} for ${url} (No credentials configured)`);
      return;
    }

    try {
      const tokens = await this.jwtClient.authorize();
      
      const res = await axios.post('https://indexing.googleapis.com/v3/urlNotifications:publish', {
        url: url,
        type: action
      }, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.access_token}`
        }
      });
      
      console.log(`[IndexingService] Successfully pushed ${action} for ${url}`);
      return res.data;
    } catch (error) {
      console.error(`[IndexingService] Failed to notify Google Indexing API for ${url}:`, error.message);
    }
  }
}

module.exports = new IndexingService();
