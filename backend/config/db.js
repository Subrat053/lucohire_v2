const prisma = require('./prisma');

const connectDB = async () => {
  try {
    await prisma.$connect();
    const hostname = (() => {
      try { return new URL(process.env.DATABASE_URL).hostname; } catch (_) { return 'configured host'; }
    })();
    console.log(`PostgreSQL connected through Prisma: ${hostname}`);
  } catch (error) {
    console.error(`PostgreSQL connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
