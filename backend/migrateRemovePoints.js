require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

async function migrateRemovePoints() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('achievements');

    // Remove points, category, and rarity fields from all documents
    const result = await collection.updateMany({}, { $unset: { points: 1, category: 1, rarity: 1 } });
    console.log(`Removed points, category, and rarity fields from ${result.modifiedCount} documents`);

    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrateRemovePoints();