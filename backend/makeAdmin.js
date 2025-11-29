const mongoose = require('mongoose');
const User = require('./models/User');

async function makeAdmin() {
  try {
    await mongoose.connect('mongodb://localhost:27017/chatapp');
    console.log('Connected to MongoDB');

    // Find user by name or email
    const user = await User.findOne({ name: 'Mentos' });
    if (user) {
      user.role = 'admin';
      await user.save();
      console.log(`User ${user.name} role updated to admin`);
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

makeAdmin();