module.paths.push("d:/Project_new/React/ServiceHub/backend/node_modules");

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: "d:/Project_new/React/ServiceHub/backend/.env" });

const GeoNamesCity = require('../legacy-mongoose-models/GeoNamesCity');
const { getTypesenseClient, initSchemas } = require("../services/typesenseService");

const CITIES_SEED = [
  { geonameId: 1273294, name: "Delhi", asciiName: "Delhi", alternateNames: ["Delhi NCR", "New Delhi"], countryCode: "IN", admin1Code: "07", admin1Name: "Delhi", admin2Code: "", population: 10927986, timezone: "Asia/Kolkata", latitude: 28.65195, longitude: 77.23149 },
  { geonameId: 1275339, name: "Mumbai", asciiName: "Mumbai", alternateNames: ["Bombay"], countryCode: "IN", admin1Code: "16", admin1Name: "Maharashtra", admin2Code: "", population: 12691836, timezone: "Asia/Kolkata", latitude: 19.0760, longitude: 72.8777 },
  { geonameId: 1277333, name: "Bengaluru", asciiName: "Bengaluru", alternateNames: ["Bangalore"], countryCode: "IN", admin1Code: "19", admin1Name: "Karnataka", admin2Code: "", population: 5104047, timezone: "Asia/Kolkata", latitude: 12.9716, longitude: 77.5946 },
  { geonameId: 1270101, name: "Chennai", asciiName: "Chennai", alternateNames: ["Madras"], countryCode: "IN", admin1Code: "25", admin1Name: "Tamil Nadu", admin2Code: "", population: 4328063, timezone: "Asia/Kolkata", latitude: 13.0827, longitude: 80.2707 },
  { geonameId: 1275004, name: "Kolkata", asciiName: "Kolkata", alternateNames: ["Calcutta"], countryCode: "IN", admin1Code: "28", admin1Name: "West Bengal", admin2Code: "", population: 4572876, timezone: "Asia/Kolkata", latitude: 22.5726, longitude: 88.3639 },
  { geonameId: 1269843, name: "Hyderabad", asciiName: "Hyderabad", alternateNames: ["Secunderabad"], countryCode: "IN", admin1Code: "40", admin1Name: "Telangana", admin2Code: "", population: 3596292, timezone: "Asia/Kolkata", latitude: 17.3850, longitude: 78.4867 },
  { geonameId: 1259223, name: "Pune", asciiName: "Pune", alternateNames: ["Poona"], countryCode: "IN", admin1Code: "16", admin1Name: "Maharashtra", admin2Code: "", population: 2935748, timezone: "Asia/Kolkata", latitude: 18.5204, longitude: 73.8567 },
  { geonameId: 1279233, name: "Ahmedabad", asciiName: "Ahmedabad", alternateNames: ["Amdavad"], countryCode: "IN", admin1Code: "09", admin1Name: "Gujarat", admin2Code: "", population: 3719710, timezone: "Asia/Kolkata", latitude: 23.0225, longitude: 72.5714 },
  { geonameId: 1268865, name: "Jaipur", asciiName: "Jaipur", alternateNames: ["Pink City"], countryCode: "IN", admin1Code: "24", admin1Name: "Rajasthan", admin2Code: "", population: 2711758, timezone: "Asia/Kolkata", latitude: 26.9124, longitude: 75.7873 },
  { geonameId: 1264733, name: "Lucknow", asciiName: "Lucknow", alternateNames: ["Lakhnau"], countryCode: "IN", admin1Code: "36", admin1Name: "Uttar Pradesh", admin2Code: "", population: 2207105, timezone: "Asia/Kolkata", latitude: 26.8467, longitude: 80.9462 },
  { geonameId: 7287650, name: "Noida", asciiName: "Noida", alternateNames: [], countryCode: "IN", admin1Code: "36", admin1Name: "Uttar Pradesh", admin2Code: "", population: 642381, timezone: "Asia/Kolkata", latitude: 28.5355, longitude: 77.3910 },
  { geonameId: 1270642, name: "Gurgaon", asciiName: "Gurgaon", alternateNames: ["Gurugram"], countryCode: "IN", admin1Code: "10", admin1Name: "Haryana", admin2Code: "", population: 197477, timezone: "Asia/Kolkata", latitude: 28.4595, longitude: 77.0266 },
  { geonameId: 1253626, name: "Surat", asciiName: "Surat", alternateNames: [], countryCode: "IN", admin1Code: "09", admin1Name: "Gujarat", admin2Code: "", population: 2894504, timezone: "Asia/Kolkata", latitude: 21.1702, longitude: 72.8311 },
  { geonameId: 1275817, name: "Bhopal", asciiName: "Bhopal", alternateNames: [], countryCode: "IN", admin1Code: "35", admin1Name: "Madhya Pradesh", admin2Code: "", population: 1599914, timezone: "Asia/Kolkata", latitude: 23.2599, longitude: 77.4126 },
  { geonameId: 1270115, name: "Indore", asciiName: "Indore", alternateNames: [], countryCode: "IN", admin1Code: "35", admin1Name: "Madhya Pradesh", admin2Code: "", population: 1837041, timezone: "Asia/Kolkata", latitude: 22.7196, longitude: 75.8577 },
  { geonameId: 1262180, name: "Nagpur", asciiName: "Nagpur", alternateNames: [], countryCode: "IN", admin1Code: "16", admin1Name: "Maharashtra", admin2Code: "", population: 2228018, timezone: "Asia/Kolkata", latitude: 21.1458, longitude: 79.0882 },
  { geonameId: 1260224, name: "Patna", asciiName: "Patna", alternateNames: [], countryCode: "IN", admin1Code: "34", admin1Name: "Bihar", admin2Code: "", population: 1599981, timezone: "Asia/Kolkata", latitude: 25.5941, longitude: 85.1376 },
  { geonameId: 1274746, name: "Chandigarh", asciiName: "Chandigarh", alternateNames: [], countryCode: "IN", admin1Code: "05", admin1Name: "Chandigarh", admin2Code: "", population: 960787, timezone: "Asia/Kolkata", latitude: 30.7333, longitude: 76.7794 },
  { geonameId: 1273865, name: "Coimbatore", asciiName: "Coimbatore", alternateNames: ["Kovai"], countryCode: "IN", admin1Code: "25", admin1Name: "Tamil Nadu", admin2Code: "", population: 959811, timezone: "Asia/Kolkata", latitude: 11.0168, longitude: 76.9558 },
  { geonameId: 1273293, name: "Delhi NCR", asciiName: "Delhi NCR", alternateNames: [], countryCode: "IN", admin1Code: "07", admin1Name: "Delhi", admin2Code: "", population: 25000000, timezone: "Asia/Kolkata", latitude: 28.65195, longitude: 77.23149 },
  { geonameId: 5128581, name: "New York City", asciiName: "New York City", alternateNames: ["New York", "NYC"], countryCode: "US", admin1Code: "NY", admin1Name: "New York", admin2Code: "", population: 8175133, timezone: "America/New_York", latitude: 40.71278, longitude: -74.00597 },
  { geonameId: 2643743, name: "London", asciiName: "London", alternateNames: [], countryCode: "GB", admin1Code: "ENG", admin1Name: "England", admin2Code: "", population: 8961989, timezone: "Europe/London", latitude: 51.5074, longitude: -0.1278 }
];

async function seed() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is missing.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  // Init Typesense schemas
  console.log("Initializing Typesense schemas...");
  await initSchemas();

  const ts = getTypesenseClient();

  console.log("Seeding GeoNamesCities...");
  for (const item of CITIES_SEED) {
    const lat = Number(item.latitude);
    const lng = Number(item.longitude);
    const searchTerms = [item.name, item.asciiName, item.admin1Name, item.countryCode, ...item.alternateNames].filter(Boolean).join(" ");
    
    const docData = {
      ...item,
      location: {
        type: "Point",
        coordinates: [lng, lat],
      },
      searchText: searchTerms,
    };

    // 1. Insert or update in MongoDB
    await GeoNamesCity.findOneAndUpdate(
      { geonameId: item.geonameId },
      docData,
      { upsert: true, new: true }
    );

    // 2. Sync to Typesense if available
    if (ts) {
      try {
        const tsDoc = {
          id: String(item.geonameId),
          geonameId: item.geonameId,
          name: item.name,
          asciiName: item.asciiName,
          countryCode: item.countryCode,
          admin1Name: item.admin1Name || "",
          timezone: item.timezone || "",
          population: item.population,
          latitude: lat,
          longitude: lng,
          searchText: searchTerms,
        };
        await ts.collections("geonames_cities").documents().upsert(tsDoc);
      } catch (err) {
        console.error(`[Typesense] Error seeding city ${item.name}:`, err.message);
      }
    }
  }

  console.log(`Successfully seeded ${CITIES_SEED.length} GeoNames cities.`);
  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

seed().catch(console.error);
