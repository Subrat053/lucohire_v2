require('dotenv').config();

const { startAIWorker, stopWorkers } = require('../modules/ai/workers/ai.worker');
const { startCrawlerWorker, stopCrawlerWorker } = require('./crawlerWorker');

startAIWorker().catch((error) => {
  console.error(`[AI Worker] Startup failed: ${error.message}`);
});

try {
  startCrawlerWorker();
  console.log('[Crawler Worker] Started successfully');
} catch (error) {
  console.error(`[Crawler Worker] Startup failed: ${error.message}`);
}

process.on('SIGINT', async () => {
  await stopWorkers('SIGINT');
  await stopCrawlerWorker();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await stopWorkers('SIGTERM');
  process.exit(0);
});
