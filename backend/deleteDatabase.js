const mongoose = require('mongoose');

async function deleteDatabase() {
  try {
    await mongoose.connect('mongodb://localhost:27017/telegram_messenger');
    console.log('Connected to telegram_messenger');

    // Drop the database
    await mongoose.connection.db.dropDatabase();
    console.log('Database telegram_messenger dropped successfully');
  } catch (error) {
    console.error('Error deleting database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

deleteDatabase();