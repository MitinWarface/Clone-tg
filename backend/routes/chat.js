const express = require('express');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/messages/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Поиск пользователей по номеру телефона
router.get('/search/users', async (req, res) => {
  try {
    const { phone } = req.query;
    console.log('Search query:', phone);
    console.log('Current user:', req.user ? req.user._id : 'No user');
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Поиск по имени теперь не используется, так как перешли на email аутентификацию
    const users = [];

    console.log('Found users:', users);
    res.json(users);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Создать приватный чат с другом
router.post('/create-private', async (req, res) => {
  try {
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ error: 'Friend ID is required' });
    }

    // Проверяем, существует ли уже чат между пользователями
    const existingChat = await Chat.findOne({
      type: 'private',
      participants: { $all: [req.user._id, friendId] }
    });

    if (existingChat) {
      return res.json(existingChat);
    }

    // Получаем информацию о друге для названия чата
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ error: 'Friend not found' });
    }

    const chatName = friend.name || 'Без имени';
    const chat = new Chat({
      name: chatName,
      type: 'private',
      participants: [req.user._id, friendId],
      createdBy: req.user._id
    });

    await chat.save();
    await chat.populate('participants', 'name');

    // Отправляем уведомление другу через Socket.IO
    const io = req.app.get('io');
    if (io) {
      // Находим сокет друга и отправляем уведомление
      const friendSocketId = req.app.get('userSockets')?.[friendId.toString()];
      if (friendSocketId) {
        io.to(friendSocketId).emit('friendRequest', {
          chat: chat,
          fromUser: {
            _id: req.user._id,
            name: req.user.name || 'Без имени'
          }
        });
      }
    }

    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Создать новый чат
router.post('/create', async (req, res) => {
  try {
    const { name, type, participants } = req.body;
    const chat = new Chat({ name, type, participants, createdBy: req.user._id });
    await chat.save();
    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить чаты пользователя
router.get('/my', async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id }).populate('participants', 'name');
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить сообщения чата
router.get('/:chatId/messages', async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId }).populate('sender', 'name avatar').sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Отправить сообщение
router.post('/:chatId/messages', upload.array('files', 5), async (req, res) => {
  try {
    const { text, sticker } = req.body;
    const files = req.files ? req.files.map(file => `/uploads/messages/${file.filename}`) : [];

    const message = new Message({
      chat: req.params.chatId,
      sender: req.user._id,
      text,
      files,
      sticker
    });
    await message.save();

    // Populate sender info
    await message.populate('sender', 'name avatar');

    // Увеличить счетчик сообщений
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.messageCount': 1 } });

    // Emit message to all chat participants via Socket.IO
    const io = req.app.get('io');
    if (io) {
      const chat = await Chat.findById(req.params.chatId);
      if (chat) {
        // Send to all participants except sender
        chat.participants.forEach(participantId => {
          if (participantId.toString() !== req.user._id.toString()) {
            const socketId = req.app.get('userSockets')?.[participantId.toString()];
            if (socketId) {
              io.to(socketId).emit('receiveMessage', message);
            }
          }
        });
      }
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Создание тестового пользователя (для тестирования)
router.post('/createTestUser', async (req, res) => {
  try {
    const User = require('../models/User');
    const testUserId = process.env.TEST_USER_ID || 'test-user-123';
    const testPhoneNumber = process.env.TEST_USER_PHONE || '+79999999999';

    let testUser = await User.findOne({ firebaseUid: testUserId });
    if (!testUser) {
      testUser = new User({
        firebaseUid: testUserId,
        phoneNumber: testPhoneNumber,
        name: 'Test User (Auto-Accept)'
      });
      await testUser.save();
      console.log('Test user created via endpoint:', testUser._id);
      res.status(201).json({ message: 'Test user created', user: testUser });
    } else {
      res.json({ message: 'Test user already exists', user: testUser });
    }
  } catch (error) {
    console.error('Error creating test user:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;