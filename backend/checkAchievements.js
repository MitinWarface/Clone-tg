require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Achievement = require('./models/Achievement');
const UserAchievement = require('./models/UserAchievement');
const User = require('./models/User');

async function checkAchievements() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const achievements = await Achievement.find({});
    console.log('Achievements:');
    achievements.forEach(ach => {
      console.log(JSON.stringify(ach.toObject(), null, 2));
    });

    const userAchievements = await UserAchievement.find({});
    console.log('UserAchievements:');
    for (const ua of userAchievements) {
      const achievement = await Achievement.findById(ua.achievementId);
      const user = await User.findById(ua.userId);
      console.log(JSON.stringify({
        ...ua.toObject(),
        achievementId: achievement ? achievement.toObject() : null,
        userId: user ? user.toObject() : null
      }, null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAchievements();