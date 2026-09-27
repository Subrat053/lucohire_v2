const prisma = require('./prisma');

const connectDB = async (retries = 3, delay = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$connect();
      const hostname = (() => {
        try { return new URL(process.env.DATABASE_URL).hostname; } catch (_) { return 'configured host'; }
      })();
      console.log(`PostgreSQL connected through Prisma: ${hostname}`);
      return;
    } catch (error) {
      console.warn(`PostgreSQL connection attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt < retries) {
        console.log(`Retrying in ${delay / 1000}s (waiting for Neon compute wake-up)...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        console.error(`PostgreSQL connection error: ${error.message}`);
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;
