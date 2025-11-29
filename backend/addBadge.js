require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Achievement = require('./models/Achievement');

async function addBadge() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const badge = new Achievement({
      name: 'Тестовый значок',
      description: 'Тестовый мини-достижение',
      image: 'default-badge.png',
      type: 'badge',
      category: 'system',
      points: 5,
      rarity: 'common'
    });
    await badge.save();
    console.log('Added badge:', badge._id);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addBadge();