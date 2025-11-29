const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
  user1: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'blocked'],
    default: 'accepted'
  },
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  acceptedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Ensure user1 < user2 for unique friendships
friendshipSchema.pre('save', function(next) {
  if (this.user1 > this.user2) {
    [this.user1, this.user2] = [this.user2, this.user1];
  }
  next();
});

// Indexes
friendshipSchema.index({ user1: 1, user2: 1 }, { unique: true });
friendshipSchema.index({ user1: 1, status: 1 });
friendshipSchema.index({ user2: 1, status: 1 });
friendshipSchema.index({ status: 1 });

module.exports = mongoose.model('Friendship', friendshipSchema);