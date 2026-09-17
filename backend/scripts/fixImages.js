const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/servicehub').then(async () => {
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({ 'profileImage': { $regex: '7070' } }).toArray();
  const companies = await db.collection('companies').find({ 'logo': { $regex: '7070' } }).toArray();
  console.log('Users with 7070:', users.length);
  console.log('Companies with 7070:', companies.length);
  
  if (users.length > 0) console.log('Sample user:', users[0].profileImage);
  if (companies.length > 0) console.log('Sample company:', companies[0].logo);
  
  // Update them
  if (users.length > 0) {
    await db.collection('users').updateMany(
      { 'profileImage': { $regex: '7070' } },
      [{ $set: { profileImage: { $replaceOne: { input: "$profileImage", find: "http://localhost:7070", replacement: "" } } } }]
    );
    console.log('Updated users');
  }
  if (companies.length > 0) {
    await db.collection('companies').updateMany(
      { 'logo': { $regex: '7070' } },
      [{ $set: { logo: { $replaceOne: { input: "$logo", find: "http://localhost:7070", replacement: "" } } } }]
    );
    console.log('Updated companies');
  }
  
  process.exit(0);
});
