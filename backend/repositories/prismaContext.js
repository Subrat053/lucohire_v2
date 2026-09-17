const { AsyncLocalStorage } = require('async_hooks');

const prisma = require('../config/prisma');

const storage = new AsyncLocalStorage();

function getPrismaClient() {
  return storage.getStore() || prisma;
}

function withPrismaTransaction(callback, options) {
  return prisma.$transaction(
    (transactionClient) => storage.run(transactionClient, callback),
    options,
  );
}

module.exports = {
  getPrismaClient,
  withPrismaTransaction,
};

