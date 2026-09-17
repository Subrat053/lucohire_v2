const Typesense = require("typesense");

let client = null;

/**
 * Initializes and returns the Typesense client.
 * @returns {Typesense.Client|null}
 */
function getTypesenseClient() {
  if (client) return client;

  const host = process.env.TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_API_KEY;
  const port = process.env.TYPESENSE_PORT || "8108";
  const protocol = process.env.TYPESENSE_PROTOCOL || "http";

  if (!host || !apiKey) {
    console.warn("[Typesense] Credentials missing in environment variables. Falling back to MongoDB database queries.");
    return null;
  }

  client = new Typesense.Client({
    nodes: [
      {
        host,
        port: parseInt(port),
        protocol,
      },
    ],
    apiKey,
    connectionTimeoutSeconds: 5,
  });

  return client;
}

/**
 * Instantiates the GeoNames and Candidates schemas on Typesense if they do not already exist.
 */
async function initSchemas() {
  const ts = getTypesenseClient();
  if (!ts) return;

  // 1. geonames_cities collection
  try {
    await ts.collections("geonames_cities").retrieve();
    console.log("[Typesense] Collection 'geonames_cities' already exists.");
  } catch (err) {
    console.log("[Typesense] Creating 'geonames_cities' collection...");
    await ts.collections().create({
      name: "geonames_cities",
      fields: [
        { name: "id", type: "string" },
        { name: "geonameId", type: "int32" },
        { name: "name", type: "string" },
        { name: "asciiName", type: "string", optional: true },
        { name: "countryCode", type: "string", facet: true },
        { name: "admin1Name", type: "string", optional: true, facet: true },
        { name: "timezone", type: "string", optional: true },
        { name: "population", type: "int32" },
        { name: "latitude", type: "float" },
        { name: "longitude", type: "float" },
        { name: "searchText", type: "string" },
      ],
      default_sorting_field: "population",
    });
  }

  // 2. candidates collection
  try {
    await ts.collections("candidates").retrieve();
    console.log("[Typesense] Collection 'candidates' already exists.");
  } catch (err) {
    console.log("[Typesense] Creating 'candidates' collection...");
    await ts.collections().create({
      name: "candidates",
      fields: [
        { name: "id", type: "string" },
        { name: "fullNameMasked", type: "string" },
        { name: "skills", type: "string[]", facet: true },
        { name: "normalizedSkills", type: "string[]", facet: true },
        { name: "experienceYears", type: "int32", facet: true },
        { name: "cityName", type: "string", facet: true },
        { name: "countryCode", type: "string", facet: true },
        { name: "availability", type: "string", facet: true },
        { name: "expectedSalary", type: "int32" },
        { name: "jobRole", type: "string", facet: true },
        { name: "industry", type: "string", facet: true },
        { name: "profileScore", type: "int32" },
        { name: "isOpenToWork", type: "bool" },
        { name: "createdAt", type: "int64" },
      ],
      default_sorting_field: "profileScore",
    });
  }
}

/**
 * Synchronizes synonyms configuration for candidates collection.
 */
async function syncSynonyms() {
  const ts = getTypesenseClient();
  if (!ts) return;

  const synonymsList = [
    {
      id: "product-manager-synonyms",
      synonyms: ["product manager", "product owner", "business analyst"],
    },
    {
      id: "frontend-developer-synonyms",
      synonyms: ["frontend developer", "react developer", "ui developer"],
    },
    {
      id: "backend-developer-synonyms",
      synonyms: ["backend developer", "node.js developer", "api developer"],
    },
    {
      id: "sales-executive-synonyms",
      synonyms: ["sales executive", "business development executive", "bde"],
    },
    {
      id: "digital-marketing-synonyms",
      synonyms: ["digital marketing", "seo", "smm", "performance marketing"],
    },
  ];

  for (const syn of synonymsList) {
    try {
      await ts.collections("candidates").synonyms().upsert(syn.id, {
        synonyms: syn.synonyms,
      });
      console.log(`[Typesense] Synonym synced: ${syn.id}`);
    } catch (err) {
      console.error(`[Typesense] Failed to upsert synonym ${syn.id}:`, err.message);
    }
  }
}

module.exports = {
  getTypesenseClient,
  initSchemas,
  syncSynonyms,
};
