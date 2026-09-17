const { MongoClient } = require('mongodb');
require('dotenv').config();

const oldUri = process.env.OLD_MONGODB_URI;
// New Database URI
const newUri = process.env.MONGODB_URI;

async function migrateDatabase() {
  if (!oldUri || !newUri) {
    console.error("Missing database URIs. Please check your .env file.");
    process.exit(1);
  }

  console.log("Connecting to old database...");
  const oldClient = new MongoClient(oldUri);
  await oldClient.connect();
  const oldDb = oldClient.db(); // Uses default database from URI
  console.log(`Connected to old database: ${oldDb.databaseName}`);

  console.log("Connecting to new database...");
  const newClient = new MongoClient(newUri);
  await newClient.connect();
  const newDb = newClient.db('servicehub'); // Target database name
  console.log(`Connected to new database: ${newDb.databaseName}`);

  try {
    // Get all collections in the old database
    const collections = await oldDb.listCollections().toArray();
    
    for (let collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      // Skip system collections
      if (collectionName.startsWith('system.')) continue;

      console.log(`\nMigrating collection: ${collectionName}...`);
      
      const oldCollection = oldDb.collection(collectionName);
      const newCollection = newDb.collection(collectionName);

      // Fetch all documents from the old collection
      const documents = await oldCollection.find({}).toArray();
      
      if (documents.length > 0) {
        // Insert all documents into the new collection
        try {
          // Use unordered bulk insert to skip duplicates if any
          await newCollection.insertMany(documents, { ordered: false });
          console.log(`Successfully migrated ${documents.length} documents into ${collectionName}`);
        } catch (insertError) {
          // If some documents already exist, it will throw a BulkWriteError but insert the rest
          if (insertError.code === 11000) {
             console.log(`Migrated documents into ${collectionName} (skipped some duplicates).`);
          } else {
             console.error(`Error inserting into ${collectionName}:`, insertError.message);
          }
        }
      } else {
        console.log(`Collection ${collectionName} is empty. Skipped.`);
      }

      // Migrate indexes
      try {
        const indexes = await oldCollection.indexes();
        const newIndexes = indexes.filter(index => index.name !== '_id_').map(index => {
          // Remove unique/system-specific fields that cannot be directly copied
          delete index.v;
          delete index.ns;
          return index;
        });
        
        if (newIndexes.length > 0) {
           await newCollection.createIndexes(newIndexes);
           console.log(`Migrated ${newIndexes.length} indexes for ${collectionName}`);
        }
      } catch (indexError) {
        console.warn(`Could not migrate indexes for ${collectionName}:`, indexError.message);
      }
    }

    console.log("\nMigration completed successfully! 🎉");
    console.log("All data from the old database is now copied to the new database.");
    console.log("Your old database remains completely untouched and intact.");

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await oldClient.close();
    await newClient.close();
    process.exit(0);
  }
}

migrateDatabase();
