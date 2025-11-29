const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  backgroundImage: { type: String, default: '' },
  backgroundColor: { type: String, default: '#1a1a1a' },
  banner: { type: String, default: '' },
  status: { type: String, default: 'Доступен' },
  bio: { type: String, default: '', maxlength: 500 },
  location: { type: String, default: '' },
  website: { type: String, default: '' },
  birthday: { type: Date },
  lastSeen: { type: Date, default: Date.now },
  isOnline: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
userProfileSchema.index({ userId: 1 }, { unique: true });
userProfileSchema.index({ isOnline: 1 });

module.exports = mongoose.model('UserProfile', userProfileSchema);