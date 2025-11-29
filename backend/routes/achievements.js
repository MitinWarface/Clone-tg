const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const UserAchievement = require('../models/UserAchievement');
const Achievement = require('../models/Achievement');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Multer config for achievement images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/achievements/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '.png');
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimes.includes(file.mimetype) || ext === '.dds') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PNG, JPEG, WebP, and DDS are allowed.'), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });


// Middleware для проверки админа
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Access denied' });
};

// Get user achievements
router.get('/:userId', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);

    const userAchievements = await UserAchievement.find({ userId: req.params.userId })
      .populate('achievementId')
      .sort({ unlockedAt: -1 })
      .limit(limitNum)
      .skip(offsetNum);

    const achievements = userAchievements
      .filter(ua => ua.achievementId) // Filter out if achievement was deleted
      .map(ua => ({
        name: ua.achievementId.name,
        description: ua.achievementId.description,
        image: ua.achievementId.image,
        type: ua.achievementId.type,
        unlockedAt: ua.unlockedAt
      }));

    res.json(achievements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user achievements
router.get('/user/me', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);

    const userAchievements = await UserAchievement.find({ userId: req.user._id })
      .populate('achievementId')
      .sort({ unlockedAt: -1 })
      .limit(limitNum)
      .skip(offsetNum);

    const achievements = userAchievements
      .filter(ua => ua.achievementId) // Filter out if achievement was deleted
      .map(ua => ({
        name: ua.achievementId.name,
        description: ua.achievementId.description,
        image: ua.achievementId.image,
        type: ua.achievementId.type,
        unlockedAt: ua.unlockedAt
      }));

    res.json(achievements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign achievement to user (admin only)
router.post('/assign', isAdmin, async (req, res) => {
  try {
    const { userId, achievementName } = req.body;
    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Find achievement
    const achievement = await Achievement.findOne({ name: achievementName });
    if (!achievement) {
      return res.status(400).json({ error: 'Achievement not found' });
    }

    // Check if user already has this achievement
    const existingUserAchievement = await UserAchievement.findOne({
      userId: userId,
      achievementId: achievement._id.toString()
    });
    if (existingUserAchievement) {
      return res.json({ message: 'Achievement already assigned' });
    }

    // Create UserAchievement
    const userAchievement = new UserAchievement({
      userId: userIdObj,
      achievementId: achievement._id
    });
    await userAchievement.save();

    // Увеличить счетчик достижений
    await User.findByIdAndUpdate(userIdObj, { $inc: { 'stats.achievementCount': 1 } });

    // Emit real-time notification to the user
    const io = req.app.get('io');
    const userSockets = req.app.get('userSockets');
    const socketId = userSockets.get(userId);
    console.log('Emitting achievementUnlocked to user:', userId, 'socketId:', socketId);
    if (socketId && io) {
      io.to(socketId).emit('achievementUnlocked', {
        achievement: {
          name: achievement.name,
          description: achievement.description,
          image: achievement.image,
          type: achievement.type,
          unlockedAt: userAchievement.unlockedAt
        }
      });
      console.log('Achievement unlocked event emitted');
    } else {
      console.log('Socket not found for user:', userId);
    }

    res.json({ message: 'Achievement assigned', achievement: {
      name: achievement.name,
      description: achievement.description,
      image: achievement.image,
      unlockedAt: userAchievement.unlockedAt
    } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Revoke achievement from user (admin only)
router.post('/revoke', isAdmin, async (req, res) => {
  try {
    const { userId, achievementName } = req.body;
    console.log('Revoking achievement:', achievementName, 'from user:', userId);

    // Find achievement
    const achievement = await Achievement.findOne({ name: achievementName });
    if (!achievement) {
      console.log('Achievement not found:', achievementName);
      return res.status(400).json({ error: 'Achievement not found' });
    }

    // Find and delete UserAchievement
    const userAchievement = await UserAchievement.findOneAndDelete({
      userId: userId,
      achievementId: achievement._id
    });

    if (!userAchievement) {
      console.log('User achievement not found');
      return res.status(400).json({ error: 'Achievement not assigned to user' });
    }

    console.log('Revoked achievement');
    res.json({ message: 'Achievement revoked' });
  } catch (error) {
    console.error('Error revoking achievement:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new achievement (admin only)
router.post('/create', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, type } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext === '.dds') {
      // Convert DDS to PNG using ImageMagick
      try {
        await execPromise(`magick convert "${req.file.path}" "${req.file.path}"`);
      } catch (error) {
        console.error('Error converting DDS to PNG:', error);
        return res.status(500).json({ error: 'Failed to convert DDS image' });
      }
    }

    const achievement = new Achievement({
      name,
      description,
      image: req.file.filename,
      type: type || 'achievement',
      category: 'system'
    });

    await achievement.save();

    // Auto-assign to creator for testing
    const userAchievement = new UserAchievement({
      userId: req.user._id,
      achievementId: achievement._id
    });
    await userAchievement.save();

    // Emit real-time notification
    const io = req.app.get('io');
    const userSockets = req.app.get('userSockets');
    const socketId = userSockets.get(req.user._id.toString());
    if (socketId && io) {
      io.to(socketId).emit('achievementUnlocked', {
        achievement: {
          name: achievement.name,
          description: achievement.description,
          image: achievement.image,
          type: achievement.type,
          unlockedAt: userAchievement.unlockedAt
        }
      });
    }

    res.json({ message: 'Achievement created and assigned to you', achievement });
  } catch (error) {
    console.error('Error creating achievement:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update achievement (admin only)
router.put('/update/:id', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, type } = req.body;

    const updateData = { name, description, type };
    if (req.file) {
      updateData.image = req.file.filename;
    }

    const achievement = await Achievement.findByIdAndUpdate(id, updateData, { new: true });
    if (!achievement) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    res.json({ message: 'Achievement updated', achievement });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete achievement (admin only)
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if achievement is assigned to any users
    const userAchievements = await UserAchievement.find({ achievementId: id });
    if (userAchievements.length > 0) {
      return res.status(400).json({ error: 'Cannot delete achievement that is assigned to users' });
    }

    await Achievement.findByIdAndDelete(id);
    res.json({ message: 'Achievement deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all achievements
router.get('/', async (req, res) => {
  try {
    const achievements = await Achievement.find({ isActive: true }).select('name description image type category');
    res.json(achievements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;