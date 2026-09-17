const rateLimit = require('express-rate-limit');

const aiRateLimiter = rateLimit({
  windowMs: Number(process.env.AI_RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.AI_RATE_LIMIT_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many AI requests. Please try again shortly.',
  },
});

module.exports = {
  aiRateLimiter,
};
