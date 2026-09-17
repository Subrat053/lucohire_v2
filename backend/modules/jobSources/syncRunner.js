const axios = require('axios');
const JobSourceConfig = require('../../models/JobSourceConfig');
const ExternalJob = require('../../models/ExternalJob');

async function runJobSourceSync(payload) {
  const { sourceName } = payload;
  const source = await JobSourceConfig.findOne({ sourceName });
  if (!source) throw new Error(`Source not found: ${sourceName}`);

  if (!source.isActive) {
    return { skipped: true, reason: 'Source is paused' };
  }

  if (source.isZeroCode) {
    if (source.authType === 'Webhook') {
      return { skipped: true, reason: 'Webhook sources are pushed to passively' };
    }
    
    try {
      const config = { timeout: 10000, headers: {} };
      if (source.authType === 'Bearer token' && source.apiCredentialsRef) {
        config.headers['Authorization'] = `Bearer ${process.env[source.apiCredentialsRef] || source.apiCredentialsRef}`;
      } else if (source.authType === 'Custom header' && source.apiCredentialsRef) {
        config.headers['x-api-key'] = process.env[source.apiCredentialsRef] || source.apiCredentialsRef;
      }
      
      const response = await axios.get(source.apiBaseUrl, config);
      const data = response.data;
      
      let jobsArray = data;
      // Navigate to results key if specified
      if (source.inputSchemaJson && source.inputSchemaJson.resultsKey) {
        const keys = source.inputSchemaJson.resultsKey.split('.');
        for (const k of keys) {
          if (jobsArray && jobsArray[k]) {
            jobsArray = jobsArray[k];
          } else {
            jobsArray = [];
            break;
          }
        }
      }
      
      if (!Array.isArray(jobsArray)) {
        throw new Error('Data fetched is not an array. Check resultsKey mapping.');
      }
      
      let savedCount = 0;
      for (const rawJob of jobsArray) {
        try {
          const mappedTitle = resolvePath(rawJob, source.outputMappingJson?.title || 'title');
          const mappedCompany = resolvePath(rawJob, source.outputMappingJson?.companyName || 'company');
          const mappedUrl = resolvePath(rawJob, source.outputMappingJson?.applyUrl || 'url');
          
          if (!mappedTitle || !mappedCompany) continue;
          
          await ExternalJob.updateOne(
            { originalJobId: resolvePath(rawJob, 'id') || `${mappedCompany}-${mappedTitle}`, sourceName: source.sourceName },
            { 
              $set: {
                title: mappedTitle,
                companyName: mappedCompany,
                applyUrl: mappedUrl,
                status: 'pending'
              }
            },
            { upsert: true }
          );
          savedCount++;
        } catch(err) {
          console.error('Row map error', err);
        }
      }
      
      source.lastSyncAt = new Date();
      source.lastError = '';
      source.failureCount = 0;
      await source.save();
      
      return { success: true, count: savedCount };
      
    } catch (error) {
      source.lastError = error.message;
      source.failureCount += 1;
      await source.save();
      throw error;
    }
  }

  // Placeholder for hardcoded sources (adzuna, etc.)
  return { skipped: true, reason: 'Hardcoded fetcher not fully implemented in this module' };
}

function resolvePath(obj, path) {
  return path.split('.').reduce((o, i) => (o ? o[i] : null), obj);
}

module.exports = {
  runJobSourceSync
};
