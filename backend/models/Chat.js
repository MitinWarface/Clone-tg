const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['private', 'group'], default: 'private' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, default: '' },
  avatar: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  lastMessageAt: { type: Date, default: Date.now },
  messageCount: { type: Number, default: 0 },
  // Platform integration
  platform: { type: String, enum: ['chatapp', 'telegram'], default: 'chatapp' },
  telegramChatId: { type: String }, // For Telegram chat ID mapping
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for performance
chatSchema.index({ createdBy: 1 });
chatSchema.index({ type: 1 });
chatSchema.index({ isActive: 1 });
chatSchema.index({ lastMessageAt: -1 });
chatSchema.index({ platform: 1 });
chatSchema.index({ telegramChatId: 1 }, { sparse: true });

module.exports = mongoose.model('Chat', chatSchema);