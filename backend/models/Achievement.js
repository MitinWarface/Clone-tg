const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  image: { type: String, required: true }, // filename of uploaded image
  requirements: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  type: {
    type: String,
    enum: ['achievement', 'badge'],
    default: 'achievement'
  },
  level: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Indexes
achievementSchema.index({ isActive: 1 });

module.exports = mongoose.model('Achievement', achievementSchema);