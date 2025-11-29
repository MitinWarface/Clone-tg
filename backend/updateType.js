require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Achievement = require('./models/Achievement');

async function updateType() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const result = await Achievement.updateOne({ name: '2' }, { type: 'badge' });
    console.log('Update result:', result);

    const ach = await Achievement.findOne({ name: '2' });
    if (ach) {
      console.log('Achievement 2 type:', ach.type);
    } else {
      console.log('Achievement 2 not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateType();