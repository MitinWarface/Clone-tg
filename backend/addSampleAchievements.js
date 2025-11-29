require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Achievement = require('./models/Achievement');

async function addSampleAchievements() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const samples = [
      {
        name: 'Первый шаг',
        description: 'Зарегистрировался в приложении',
        image: 'default-first-step.png',
        type: 'achievement',
        category: 'system',
        points: 10,
        rarity: 'common'
      },
      {
        name: 'Социальный',
        description: 'Добавил первого друга',
        image: 'default-social.png',
        type: 'achievement',
        category: 'social',
        points: 25,
        rarity: 'common'
      },
      {
        name: 'Мини-значок',
        description: 'Тестовый мини-значок',
        image: 'default-badge.png',
        type: 'badge',
        category: 'system',
        points: 5,
        rarity: 'common'
      }
    ];

    for (const sample of samples) {
      const existing = await Achievement.findOne({ name: sample.name });
      if (!existing) {
        const achievement = new Achievement(sample);
        await achievement.save();
        console.log(`Added achievement: ${sample.name}`);
      } else {
        console.log(`Achievement already exists: ${sample.name}`);
      }
    }

    console.log('Sample achievements added');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addSampleAchievements();