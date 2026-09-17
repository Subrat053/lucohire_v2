const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/servicehub').then(async () => {
  const db = mongoose.connection.db;
  
  // Update all plans to remove gstPercent or set to 0
  const result = await db.collection('plans').updateMany({}, { $set: { gstPercent: 0 } });
  console.log(`Updated ${result.modifiedCount} plans to 0% GST.`);
  
  // Also check billing_rules
  const rules = await db.collection('billingrules').updateMany({}, { $set: { countryGst: [] } });
  console.log(`Updated ${rules.modifiedCount} billing rules to remove GST.`);
  
  process.exit(0);
});
