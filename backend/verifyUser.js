const mongoose = require('mongoose');
const User = require('./models/User');

async function verifyUser() {
  try {
    // Подключение к MongoDB
    await mongoose.connect('mongodb://localhost:27017/chatapp');

    console.log('Connected to MongoDB');

    // Найти пользователя и верифицировать
    const user = await User.findOne({ email: 'finaltest@example.com' });
    if (user) {
      user.isEmailVerified = true;
      user.emailVerificationCode = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();
      console.log('User verified:', user.username, user.name, user.hasSetName);
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error('Error verifying user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

verifyUser();