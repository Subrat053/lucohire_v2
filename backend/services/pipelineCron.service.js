const cron = require('node-cron');
const PipelineAutomation = require('../models/PipelineAutomation');
const { triggerIngestion } = require('../controllers/adminDataPipeline.controller');

class PipelineCronService {
  constructor() {
    this.jobs = {};
  }

  init() {
    if (String(process.env.ENABLE_PIPELINE_JOBS || '').toLowerCase() !== 'true'
      || String(process.env.ENABLE_CONNECTORS || '').toLowerCase() !== 'true'
      || String(process.env.ENABLE_CRON || '').toLowerCase() !== 'true') {
      console.log('[PipelineCron] Pipeline jobs disabled; scheduler not initialized.');
      return;
    }
    console.log('[PipelineCron] Initializing scheduled automations...');
    
    // Run daily at midnight to check for automations that need to run
    // For testing purposes, we could run it every minute or hour, but we'll stick to a daily cron
    // that checks the 'frequency' and 'lastRunAt'
    cron.schedule('0 0 * * *', async () => {
      await this.processAutomations();
    });

    // Also run immediately on boot just in case we missed a day
    setTimeout(() => {
      this.processAutomations().catch(console.error);
    }, 5000);
  }

  async processAutomations() {
    if (String(process.env.ENABLE_PIPELINE_JOBS || '').toLowerCase() !== 'true'
      || String(process.env.ENABLE_CONNECTORS || '').toLowerCase() !== 'true') return;
    try {
      console.log('[PipelineCron] Checking for due automations...');
      
      const automations = await PipelineAutomation.find({ status: 'active' });
      
      for (const auto of automations) {
        let isDue = false;
        const now = new Date();
        
        if (!auto.lastRunAt) {
          isDue = true;
        } else {
          const daysSinceLastRun = (now - auto.lastRunAt) / (1000 * 60 * 60 * 24);
          if (auto.frequency === 'hourly' && (now - auto.lastRunAt) / (1000 * 60 * 60) >= 1) isDue = true;
          if (auto.frequency === 'daily' && daysSinceLastRun >= 1) isDue = true;
          if (auto.frequency === 'weekly' && daysSinceLastRun >= 7) isDue = true;
        }

        if (isDue) {
          console.log(`[PipelineCron] Executing automation: ${auto.name} (ID: ${auto._id})`);
          await this.executeAutomation(auto);
        }
      }
    } catch (err) {
      console.error('[PipelineCron] Error processing automations:', err);
    }
  }

  async executeAutomation(automation) {
    try {
      // Mock Express req and res
      const req = {
        body: {
          configId: automation.configId.toString(),
          isPreview: false,
          limit: automation.maxRecordsPerRun,
          keywords: automation.searchQuery,
          location: automation.location,
          experience: `${automation.experienceMin}-${automation.experienceMax}`,
          jobType: automation.jobType,
          activeFilters: automation.activeFilters,
          outreachChannels: automation.outreachChannels,
          autoSendClaimLink: automation.autoSendClaimLink
        }
      };

      let hasFailed = false;
      let failureData = null;

      const res = {
        status: (statusCode) => ({
          json: (data) => {
            if (statusCode >= 400) {
              hasFailed = true;
              failureData = data;
              console.error(`[PipelineCron] Automation ${automation.name} failed with status ${statusCode}:`, data);
            } else {
              console.log(`[PipelineCron] Automation ${automation.name} completed successfully.`);
            }
          }
        })
      };

      // Call the controller method
      await triggerIngestion(req, res);

      if (hasFailed) {
        throw new Error(`Automation failed with response: ${JSON.stringify(failureData)}`);
      }

      automation.lastRunAt = new Date();
      automation.failureCount = 0;
      
      const now = new Date();
      if (automation.frequency === 'hourly') automation.nextRunAt = new Date(now.getTime() + 60 * 60 * 1000);
      if (automation.frequency === 'daily') automation.nextRunAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      if (automation.frequency === 'weekly') automation.nextRunAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      await automation.save();

    } catch (err) {
      console.error(`[PipelineCron] Error executing automation ${automation.name}:`, err);
      automation.failureCount = (automation.failureCount || 0) + 1;
      if (automation.failureCount >= 3) {
        automation.status = 'error';
        console.warn(`[PipelineCron] Automation ${automation.name} disabled due to 3 consecutive failures.`);
      }
      await automation.save();
    }
  }
}

module.exports = new PipelineCronService();
