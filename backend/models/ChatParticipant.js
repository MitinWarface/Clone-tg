const mongoose = require('mongoose');

const chatParticipantSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: {
    type: String,
    enum: ['member', 'admin'],
    default: 'member'
  },
  joinedAt: { type: Date, default: Date.now },
  lastReadAt: { type: Date },
  isMuted: { type: Boolean, default: false },
  nickname: { type: String } // Custom nickname in this chat
});

// Indexes
chatParticipantSchema.index({ chatId: 1, userId: 1 }, { unique: true });
chatParticipantSchema.index({ userId: 1 });
chatParticipantSchema.index({ chatId: 1 });

module.exports = mongoose.model('ChatParticipant', chatParticipantSchema);