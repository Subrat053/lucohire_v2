const cron = require('node-cron');
const { runScheduledPipeline } = require('../services/pipeline/jsearchScanService');

const initPipelineCron = () => {
  if (String(process.env.ENABLE_PIPELINE_JOBS || '').toLowerCase() !== 'true'
    || String(process.env.ENABLE_CONNECTORS || '').toLowerCase() !== 'true'
    || String(process.env.ENABLE_CRON || '').toLowerCase() !== 'true') {
    console.log('[PipelineCron] Pipeline jobs disabled; cron not initialized.');
    return;
  }
  const cronExpression = process.env.PIPELINE_DEFAULT_CRON || '0 1 * * *'; // Default: 1 AM daily

  console.log(`[PipelineCron] Initializing job with schedule: ${cronExpression}`);

  cron.schedule(cronExpression, async () => {
    console.log(`[PipelineCron] Triggering scheduled pipeline run at ${new Date().toISOString()}`);
    try {
      await runScheduledPipeline();
    } catch (error) {
      console.error('[PipelineCron] Error during scheduled run:', error);
    }
  });
};

module.exports = { initPipelineCron };
