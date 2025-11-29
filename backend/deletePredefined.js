require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Achievement = require('./models/Achievement');

async function deletePredefined() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const predefinedNames = ['Первый шаг', 'Социальный', 'Мини-значок'];

    const result = await Achievement.deleteMany({ name: { $in: predefinedNames } });
    console.log(`Deleted ${result.deletedCount} predefined achievements`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deletePredefined();