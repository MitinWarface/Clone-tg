const mongoose = require('mongoose');
const User = require('./models/User');

async function connectAndShowData() {
  try {
    // Подключение к MongoDB
    await mongoose.connect('mongodb://localhost:27017/chatapp');

    console.log('Connected to MongoDB');

    // Показать всех пользователей
    const users = await User.find({});
    console.log('Users in database:');
    users.forEach(user => {
      console.log(`- ${user.email}: ${user.role} (name: ${user.name})`);
    });

    console.log(`Total users: ${users.length}`);
  } catch (error) {
    console.error('Error connecting to database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

connectAndShowData();