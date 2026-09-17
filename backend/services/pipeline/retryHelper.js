/**
 * Helper to retry async functions with exponential backoff.
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async (fn, maxRetries, baseDelayMs = 2000) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      
      // Do not retry for certain client errors unless they are rate limits (429)
      const status = error.response ? error.response.status : null;
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw error;
      }

      if (attempt >= maxRetries) {
        throw error;
      }

      // Exponential backoff: 2s, 4s, 8s, etc.
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`[RetryHelper] Attempt ${attempt} failed. Retrying in ${delay}ms...`, error.message);
      await wait(delay);
    }
  }
};

module.exports = { withRetry };
