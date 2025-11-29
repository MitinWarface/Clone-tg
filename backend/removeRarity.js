require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Achievement = require('./models/Achievement');

async function removeRarity() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const result = await Achievement.updateMany({}, { $unset: { rarity: 1 } });
    console.log(`Removed rarity from ${result.modifiedCount} achievements`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

removeRarity();