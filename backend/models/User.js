const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, minlength: 3, maxlength: 30 },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, default: '' },
  hasSetName: { type: Boolean, default: false },
  avatar: { type: String, default: '' },
  role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
  isBlocked: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationCode: { type: String },
  emailVerificationExpires: { type: Date },
  lastLogin: { type: Date },
  // Social features
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
  }],
  // Telegram integration fields
  telegramId: { type: String, unique: true, sparse: true },
  telegramUsername: { type: String },
  telegramChatId: { type: String },
  stats: {
    messageCount: { type: Number, default: 0 },
    friendCount: { type: Number, default: 0 },
    achievementCount: { type: Number, default: 0 },
    level: { type: Number, default: 1 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for performance
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ telegramId: 1 }, { sparse: true });
userSchema.index({ name: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isEmailVerified: 1 });

const User = mongoose.model('User', userSchema, null, { strictPopulate: false });

module.exports = User;