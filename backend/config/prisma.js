const { PrismaClient } = require('@prisma/client');

const prisma = globalThis.__lucohirePrisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__lucohirePrisma = prisma;
}

module.exports = prisma;

