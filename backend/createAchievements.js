const mongoose = require('mongoose');
const Achievement = require('./models/Achievement');
const UserAchievement = require('./models/UserAchievement');
const User = require('./models/User');

const predefinedAchievements = [
  {
    name: 'Первый шаг',
    description: 'Зарегистрировался в приложении',
    icon: '🎯',
    category: 'system',
    points: 10,
    rarity: 'common'
  },
  {
    name: 'Социальный',
    description: 'Добавил первого друга',
    icon: '👥',
    category: 'social',
    points: 25,
    rarity: 'common'
  },
  {
    name: 'Коммуникатор',
    description: 'Отправил первое сообщение',
    icon: '💬',
    category: 'communication',
    points: 15,
    rarity: 'common'
  },
  {
    name: 'Персонализатор',
    description: 'Настроил профиль',
    icon: '🎨',
    category: 'profile',
    points: 20,
    rarity: 'common'
  }
];

async function createAchievements() {
  try {
    await mongoose.connect('mongodb://localhost:27017/chatapp');
    console.log('Connected to MongoDB');

    // Create achievements
    for (const ach of predefinedAchievements) {
      const existing = await Achievement.findOne({ name: ach.name });
      if (!existing) {
        const achievement = new Achievement(ach);
        await achievement.save();
        console.log(`Created achievement: ${ach.name}`);
      } else {
        console.log(`Achievement already exists: ${ach.name}`);
      }
    }

    // Assign achievement to any user
    const users = await User.find();
    if (users.length > 0) {
      const user = users[0]; // Take first user
      const achievement = await Achievement.findOne({ name: 'Первый шаг' });
      if (achievement) {
        const existingUA = await UserAchievement.findOne({
          userId: user._id,
          achievementId: achievement._id
        });
        if (!existingUA) {
          const ua = new UserAchievement({
            userId: user._id,
            achievementId: achievement._id
          });
          await ua.save();
          console.log(`Assigned achievement to user: ${user.name || user.username} (ID: ${user._id})`);
        } else {
          console.log(`User ${user.name || user.username} already has this achievement`);
        }
      }
    } else {
      console.log('No users found');
    }

    console.log('Achievements setup complete');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createAchievements();