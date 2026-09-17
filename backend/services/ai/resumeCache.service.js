const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');

const asJson = (value) => JSON.parse(JSON.stringify(value ?? {}));

async function getCachedResume(fileHash) {
  try {
    const cachedDoc = await prisma.resumeFileCache.findUnique({ where: { fileHash } });
    
    if (cachedDoc) {
      logger.info('[Resume AI Cache] Cache hit', { fileHash });
      return {
        parsedResult: cachedDoc.parsedResult,
        resumeUrl: cachedDoc.resumeUrl
      };
    }

    logger.info('[Resume AI Cache] Cache miss', { fileHash });
    return null;
  } catch (error) {
    logger.warn('[Resume AI Cache] Error fetching cache', { error: error.message });
    return null;
  }
}

async function setCachedResume(fileHash, parsedResult, resumeUrl) {
  try {
    const jsonResult = asJson(parsedResult);
    await prisma.resumeFileCache.upsert({
      where: { fileHash },
      create: { fileHash, parsedResult: jsonResult, resumeUrl: resumeUrl || '' },
      update: { parsedResult: jsonResult, ...(resumeUrl !== undefined ? { resumeUrl: resumeUrl || '' } : {}) },
    });
    
    logger.info('[Resume AI Cache] Cached successfully', { fileHash });
  } catch (error) {
    logger.warn('[Resume AI Cache] Error saving cache', { error: error.message });
  }
}

module.exports = {
  getCachedResume,
  setCachedResume,
};
