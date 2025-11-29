const mongoose = require('mongoose');

const userAchievementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  achievementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement', required: true },
  unlockedAt: { type: Date, default: Date.now },
  progress: { type: Number, default: 100 }, // For partial achievements
  isNew: { type: Boolean, default: true } // For notifications
});

// Indexes
userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });
userAchievementSchema.index({ userId: 1, unlockedAt: -1 });
userAchievementSchema.index({ isNew: 1 });

module.exports = mongoose.model('UserAchievement', userAchievementSchema);