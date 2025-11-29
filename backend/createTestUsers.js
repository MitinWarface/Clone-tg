const mongoose = require('mongoose');
const User = require('./models/User');

async function createTestUsers() {
  try {
    // Подключение к MongoDB
    await mongoose.connect('mongodb://localhost:27017/chatapp');

    console.log('Connected to MongoDB');

    // Создать тестовых пользователей
    const testUsers = [
      { appwriteId: 'test-admin-1', email: 'admin@example.com', username: 'adminuser', name: 'adminuser', hasSetName: true, role: 'admin' },
      { appwriteId: 'test-moderator-1', email: 'moderator@example.com', username: 'moduser', name: 'moduser', hasSetName: true, role: 'moderator' },
      { appwriteId: 'test-user-1', email: 'user@example.com', username: 'regularuser', name: 'regularuser', hasSetName: true, role: 'user' },
    ];

    for (const userData of testUsers) {
      const user = new User(userData);
      await user.save();
      console.log(`Created user: ${userData.email} with role ${userData.role}`);
    }

    console.log('Test users created successfully');
  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createTestUsers();