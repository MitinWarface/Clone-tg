const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const UserAchievement = require('../models/UserAchievement');
const Achievement = require('../models/Achievement');
const multer = require('multer');
const path = require('path');
console.log('Achievement model loaded:', !!Achievement);
console.log('Achievement model:', Achievement);
console.log('Achievement modelName:', Achievement.modelName);
(async () => {
  try {
    const count = await Achievement.countDocuments();
    console.log('Achievement count:', count);
    const testAch = await Achievement.findById('692af29e55583c769eef42d3');
    console.log('Test achievement find:', !!testAch);
  } catch (e) {
    console.log('Error:', e);
  }
})();

const router = express.Router();

// Configure multer for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/avatars/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Отправить запрос в друзья
router.post('/request', async (req, res) => {
  try {
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ error: 'Friend ID is required' });
    }

    if (friendId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Проверяем, не друзья ли уже
    const currentUser = await User.findById(req.user._id);
    if (currentUser.friends.includes(friendId)) {
      return res.status(400).json({ error: 'Already friends' });
    }

    // Проверяем, не отправлен ли уже запрос
    const existingRequest = currentUser.friendRequests.find(
      req => req.from.toString() === friendId && req.status === 'pending'
    );
    if (existingRequest) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    // Добавляем запрос в friendRequests получателя
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ error: 'User not found' });
    }

    friend.friendRequests.push({ from: req.user._id });
    await friend.save();

    // Отправляем уведомление через Socket.IO
    const io = req.app.get('io');
    if (io) {
      // Уведомление получателю
      const friendSocketId = req.app.get('userSockets')?.[friendId];
      if (friendSocketId) {
        io.to(friendSocketId).emit('friendRequest', {
          fromUser: {
            _id: req.user._id,
            name: req.user.name || 'Без имени'
          }
        });
      }
      // Уведомление отправителю
      const senderSocketId = req.app.get('userSockets')?.[req.user._id.toString()];
      if (senderSocketId) {
        io.to(senderSocketId).emit('friendRequestSent', {
          toUser: {
            _id: friendId,
            name: friend.name || 'Без имени'
          }
        });
      }
    }

    res.json({ message: 'Friend request sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Принять запрос в друзья
router.post('/accept/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    const user = await User.findById(req.user._id);
    const request = user.friendRequests.id(requestId);

    if (!request || request.status !== 'pending') {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Добавляем друг друга в друзья
    user.friends.push(request.from);
    request.status = 'accepted';
    user.stats.friendCount += 1;
    await user.save();

    const friend = await User.findById(request.from);
    friend.friends.push(req.user._id);
    friend.stats.friendCount += 1;
    await friend.save();

    // Отправляем уведомление через Socket.IO
    const io = req.app.get('io');
    if (io) {
      // Уведомление отправителю запроса
      const senderSocketId = req.app.get('userSockets')?.[request.from.toString()];
      if (senderSocketId) {
        io.to(senderSocketId).emit('friendRequestAccepted', {
          acceptedBy: {
            _id: req.user._id,
            name: req.user.name || 'Без имени'
          }
        });
      }
      // Уведомление получателю (себе)
      const receiverSocketId = req.app.get('userSockets')?.[req.user._id.toString()];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('friendAdded', {
          friend: {
            _id: request.from,
            name: friend.name || 'Без имени'
          }
        });
      }
    }

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Отклонить запрос в друзья
router.post('/reject/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    const user = await User.findById(req.user._id);
    const request = user.friendRequests.id(requestId);

    if (!request || request.status !== 'pending') {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    request.status = 'rejected';
    await user.save();

    // Отправляем уведомление через Socket.IO
    const io = req.app.get('io');
    if (io) {
      const senderSocketId = req.app.get('userSockets')?.[request.from.toString()];
      if (senderSocketId) {
        io.to(senderSocketId).emit('friendRequestRejected', {
          rejectedBy: {
            _id: req.user._id,
            name: req.user.name || 'Без имени'
          }
        });
      }
    }

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить список друзей
router.get('/list', async (req, res) => {
  try {
    console.log('Getting friends for user:', req.user._id);
    const user = await User.findById(req.user._id).populate('friends', 'name avatar');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('Found friends:', user.friends);
    res.json(user.friends);
  } catch (error) {
    console.error('Error getting friends:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить входящие запросы в друзья
router.get('/requests', async (req, res) => {
  try {
    console.log('Getting friend requests for user:', req.user._id);
    const user = await User.findById(req.user._id).populate('friendRequests.from', 'name');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const pendingRequests = user.friendRequests.filter(req => req.status === 'pending');
    console.log('Found friend requests:', pendingRequests);
    res.json(pendingRequests);
  } catch (error) {
    console.error('Error getting friend requests:', error);
    res.status(500).json({ error: error.message });
  }
});

// Удалить из друзей
router.delete('/remove/:friendId', async (req, res) => {
  try {
    const { friendId } = req.params;

    if (friendId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    const user = await User.findById(req.user._id);
    const friend = await User.findById(friendId);

    if (!friend) {
      return res.status(404).json({ error: 'Friend not found' });
    }

    // Удалить друг друга из списков друзей
    user.friends = user.friends.filter(id => id.toString() !== friendId);
    friend.friends = friend.friends.filter(id => id.toString() !== req.user._id.toString());

    await user.save();
    await friend.save();

    // Отправляем уведомление через Socket.IO
    const io = req.app.get('io');
    if (io) {
      // Уведомление обоим пользователям
      const userSocketId = req.app.get('userSockets')?.[req.user._id.toString()];
      if (userSocketId) {
        io.to(userSocketId).emit('friendRemoved', {
          removedBy: req.user._id,
          friend: {
            _id: friendId,
            name: friend.name || 'Без имени'
          }
        });
      }
      const friendSocketId = req.app.get('userSockets')?.[friendId];
      if (friendSocketId) {
        io.to(friendSocketId).emit('friendRemoved', {
          removedBy: req.user._id,
          friend: {
            _id: req.user._id,
            name: req.user.name || 'Без имени'
          }
        });
      }
    }

    res.json({ message: 'Friend removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить профиль другого пользователя
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('name profile hasSetName role stats avatar');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Получить достижения пользователя
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const userAchievements = await UserAchievement.find({ userId: userIdObj })
      .sort({ unlockedAt: -1 });
    console.log('UserAchievements found:', userAchievements.length, 'for user:', userId);

    // Manual populate
    const populatedAchievements = [];
    for (const ua of userAchievements) {
      console.log('Looking for achievement id:', ua.achievementId, 'string:', ua.achievementId.toString());
      const achievement = await Achievement.findById(ua.achievementId);
      console.log('Achievement found for', ua.achievementId.toString(), ':', !!achievement);
      if (achievement) {
        populatedAchievements.push({
          ...ua.toObject(),
          achievementId: achievement
        });
      }
    }
    console.log('Populated achievements:', populatedAchievements.length);

    // Форматировать достижения для фронтенда
    const achievements = populatedAchievements
      .filter(ua => ua.achievementId) // Filter out if achievement was deleted
      .map(ua => ({
        name: ua.achievementId.name,
        description: ua.achievementId.description,
        image: ua.achievementId.image,
        type: ua.achievementId.type,
        level: ua.achievementId.level,
        unlockedAt: ua.unlockedAt
      }));
    console.log('Achievements formatted:', achievements.length);

    console.log('Achievements after map:', achievements.length, 'for user:', userId);

    // Добавить достижения к профилю
    const userObj = user.toObject();
    userObj.achievements = achievements;
    console.log('Returning profile for user:', userId, 'achievements:', achievements.length);

    res.json(userObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить профиль пользователя
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('name profile hasSetName role stats avatar');

    // Получить достижения пользователя
    const userAchievements = await UserAchievement.find({ userId: req.user._id })
      .populate('achievementId')
      .sort({ unlockedAt: -1 });

    // Форматировать достижения для фронтенда
    const achievements = userAchievements
      .filter(ua => ua.achievementId) // Filter out if achievement was deleted
      .map(ua => ({
        name: ua.achievementId.name,
        description: ua.achievementId.description,
        image: ua.achievementId.image,
        type: ua.achievementId.type,
        level: ua.achievementId.level,
        unlockedAt: ua.unlockedAt
      }));

    // Добавить достижения к профилю
    const userObj = user.toObject();
    userObj.achievements = achievements;

    res.json(userObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Загрузить аватар
router.post('/avatar', avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const avatarPath = `/uploads/avatars/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatarPath },
      { new: true }
    ).select('name avatar');

    // Отправляем уведомление через Socket.IO всем подключенным пользователям
    const io = req.app.get('io');
    if (io) {
      io.emit('avatarUpdated', {
        userId: req.user._id,
        avatar: avatarPath
      });
    }

    res.json({ avatar: avatarPath, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Обновить профиль пользователя
router.put('/profile', async (req, res) => {
  try {
    const { name, profile } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (profile) {
      updateData['profile.backgroundColor'] = profile.backgroundColor || '#1a1a1a';
      updateData['profile.banner'] = profile.banner || '';
      updateData['profile.status'] = profile.status || 'Доступен';
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select('name profile hasSetName role avatar');

    // Получить достижения пользователя
    const userAchievements = await UserAchievement.find({ userId: req.user._id })
      .populate('achievementId')
      .sort({ unlockedAt: -1 });

    // Форматировать достижения для фронтенда
    const achievements = userAchievements
      .filter(ua => ua.achievementId) // Filter out if achievement was deleted
      .map(ua => ({
        name: ua.achievementId.name,
        description: ua.achievementId.description,
        image: ua.achievementId.image,
        unlockedAt: ua.unlockedAt
      }));

    // Добавить достижения к профилю
    user.achievements = achievements;

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;