module.paths.push("d:/Project_new/React/ServiceHub/backend/node_modules");

const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: "d:/Project_new/React/ServiceHub/backend/.env" });

const { initSchemas, syncSynonyms } = require("../services/typesenseService");

async function run() {
  console.log("Initializing Typesense schemas...");
  await initSchemas();
  
  console.log("Syncing candidate search synonyms...");
  await syncSynonyms();
  
  console.log("Synonyms sync completed successfully.");
}

run().catch(console.error);
