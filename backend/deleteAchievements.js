require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Achievement = require('./models/Achievement');

async function deleteAchievements() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const result = await Achievement.deleteMany({});
    console.log(`Deleted ${result.deletedCount} achievements`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteAchievements();