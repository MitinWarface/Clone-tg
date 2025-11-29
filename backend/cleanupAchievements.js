require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const UserAchievement = require('./models/UserAchievement');
const Achievement = require('./models/Achievement');

async function cleanupAchievements() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get all achievement IDs
    const achievements = await Achievement.find({}, '_id');
    const achievementIds = achievements.map(a => a._id.toString());

    // Find UserAchievements with invalid achievementId
    const userAchievements = await UserAchievement.find({});
    let deletedCount = 0;

    for (const ua of userAchievements) {
      if (!achievementIds.includes(ua.achievementId.toString())) {
        await UserAchievement.findByIdAndDelete(ua._id);
        deletedCount++;
        console.log(`Deleted UserAchievement with invalid achievementId: ${ua._id}`);
      }
    }

    console.log(`Cleaned up ${deletedCount} invalid UserAchievements`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanupAchievements();