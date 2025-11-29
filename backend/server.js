const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const { validateEmail, validateUsername, validatePassword, validateOTP, validateName, validateStatus } = require('./middleware/validation');
const { errorHandler, asyncHandler } = require('./middleware/errorHandler');
require('dotenv').config({ path: '../.env' });

// Load models
require('./models/User');
require('./models/Achievement');
require('./models/UserAchievement');
require('./models/Chat');
require('./models/Message');
require('./models/FriendRequest');
require('./models/ChatParticipant');
require('./models/UserProfile');


// Хранение OTP в памяти (для простоты, в продакшене использовать Redis или DB)
const otpStore = new Map();

// Функция для генерации OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Функция для отправки email с OTP
async function sendEmailOTP(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Ваш код подтверждения',
      text: `Ваш код подтверждения: ${otp}. Он действителен 5 минут.`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('OTP email sent:', info.messageId);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
}

// Функция для верификации JWT
function verifyJWT(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    return decoded;
  } catch (error) {
    throw error;
  }
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Multer config for achievement images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/achievements/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

console.log('Server starting...');

// Middleware для проверки админа
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Access denied' });
};

// Middleware для проверки модератора или админа
const isModeratorOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'moderator' || req.user.role === 'admin')) {
    return next();
  }
  return res.status(403).json({ error: 'Access denied' });
};

// Middleware для аутентификации
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = verifyJWT(token);
    const User = require('./models/User');
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static('public/uploads'));
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Подключение к MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    initializeTestUser();
  })
  .catch(err => console.log(err));

// Инициализация тестового пользователя
async function initializeTestUser() {
  try {
    const User = require('./models/User');
    const saltRounds = 10;
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';

    let testUser = await User.findOne({ email: testEmail });
    if (!testUser) {
      // Hash password for test user
      const hashedPassword = await bcrypt.hash('test123', saltRounds);

      testUser = new User({
        username: 'testuser',
        email: testEmail,
        password: hashedPassword,
        name: 'testuser', // Set name to username
        hasSetName: true,
        role: 'admin',
        isEmailVerified: true
      });
      await testUser.save();
      console.log('Test user created:', testUser._id);
    } else {
      console.log('Test user already exists:', testUser._id);
      // Ensure role is admin
      if (testUser.role !== 'admin') {
        testUser.role = 'admin';
        await testUser.save();
        console.log('Test user role updated to admin');
      }
    }

    // Initialize admin user
    const adminEmail = 'admin@example.com';
    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('admin123', saltRounds);

      adminUser = new User({
        username: 'superadmin',
        email: adminEmail,
        password: hashedPassword,
        name: 'admin', // Set name to username
        hasSetName: true,
        role: 'admin',
        isEmailVerified: true
      });
      await adminUser.save();
      console.log('Admin user created:', adminUser._id);
    } else {
      console.log('Admin user already exists:', adminUser._id);
      // Ensure role is admin
      if (adminUser.role !== 'admin') {
        adminUser.role = 'admin';
        await adminUser.save();
        console.log('Admin user role updated to admin');
      }
    }

    // Initialize regular test user
    const regularEmail = 'user@example.com';
    let regularUser = await User.findOne({ email: regularEmail });
    if (!regularUser) {
      const hashedPassword = await bcrypt.hash('user123', saltRounds);

      regularUser = new User({
        username: 'regularuser',
        email: regularEmail,
        password: hashedPassword,
        name: 'regularuser',
        hasSetName: true,
        role: 'user',
        isEmailVerified: true
      });
      await regularUser.save();
      console.log('Regular test user created:', regularUser._id);
    } else {
      console.log('Regular test user already exists:', regularUser._id);
    }

    // Сохраняем ID тестового пользователя для быстрого доступа
    global.testUserId = testUser._id.toString();
  } catch (error) {
    console.error('Error initializing test user:', error);
  }
}

// Базовый маршрут
app.get('/', (req, res) => {
  res.send('Telegram Messenger Backend');
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

// Registration route
app.post('/api/auth/register', validateUsername, validateEmail, validatePassword, asyncHandler(async (req, res) => {
  console.log('Registration route called with:', req.body);
  const { username, email, password } = req.body;

  const User = require('./models/User');

  // Check if user already exists
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    return res.status(409).json({ error: 'User with this email or username already exists' });
  }

  // Hash password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Generate verification code
  const verificationCode = generateOTP();

  // Create user
  const user = new User({
    username,
    email,
    password: hashedPassword,
    name: username, // Set name to username
    hasSetName: true, // Mark as set
    emailVerificationCode: verificationCode,
    emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  });

  await user.save();
  console.log('User saved:', user._id, user.name, user.hasSetName);

  // Send verification email
  try {
    await sendEmailOTP(email, verificationCode);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    // Don't fail registration if email fails, user can request resend
  }

  res.status(201).json({ message: 'Registration successful. Please check your email for verification code.' });
}));

// Email verification route
app.post('/api/auth/verify-email', validateEmail, validateOTP, asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const User = require('./models/User');
  const user = await User.findOne({
    email,
    emailVerificationCode: otp,
    emailVerificationExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired verification code' });
  }

  // Mark email as verified
  user.isEmailVerified = true;
  user.emailVerificationCode = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  // Generate JWT token
  const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });

  res.json({
    token,
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified
    }
  });
}));

// Login route
app.post('/api/auth/login', validatePassword, asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const User = require('./models/User');
  const user = await User.findOne({ username });

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Check if email is verified
  if (!user.isEmailVerified) {
    return res.status(403).json({ error: 'Please verify your email before logging in' });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate JWT token
  const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });

  res.json({
    token,
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified
    }
  });
}));

// Маршрут для установки имени
app.put('/api/auth/set-name', authenticate, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });

  const User = require('./models/User');
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name: name.trim(), hasSetName: true },
    { new: true }
  );

  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({ user });
});


// Routes
const chatRoutes = require('./routes/chat');
const friendRoutes = require('./routes/friends');
const achievementRoutes = require('./routes/achievements');
app.use('/api/chats', authenticate, chatRoutes);
app.use('/api/friends', authenticate, friendRoutes);
app.use('/api/achievements', authenticate, achievementRoutes);

// Admin route to get all users
app.get('/api/users', authenticate, isAdmin, async (req, res) => {
  try {
    const User = require('./models/User');
    const users = await User.find().select('name email _id role');
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search users by name
app.get('/api/users/search', authenticate, async (req, res) => {
  try {
    const User = require('./models/User');
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query parameter required' });

    const users = await User.find({
      name: { $regex: q, $options: 'i' },
      _id: { $ne: req.user._id } // Exclude current user
    }).select('name profile.status role _id').limit(20);

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Middleware to set test user for reset-db
const setTestUser = async (req, res, next) => {
  try {
    console.log('setTestUser called');
    const User = require('./models/User');
    console.log('User model loaded:', !!User);
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    console.log('testEmail:', testEmail);
    req.user = await User.findOne({ email: testEmail });
    console.log('req.user set:', !!req.user);
    next();
  } catch (error) {
    console.error('Error in setTestUser:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin route to reset database
app.post('/api/admin/reset-db', setTestUser, isAdmin, async (req, res) => {
  try {
    const User = require('./models/User');
    await User.deleteMany({});
    console.log('Database reset');
    // Reinitialize test user
    await initializeTestUser();
    res.json({ message: 'Database reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin route to manage user roles
app.put('/api/admin/manage-role', authenticate, isAdmin, async (req, res) => {
  const { email, role } = req.body;
  if (!email || !role) return res.status(400).json({ error: 'Email and role required' });
  if (!['user', 'moderator', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const User = require('./models/User');
  const user = await User.findOneAndUpdate(
    { email },
    { role },
    { new: true }
  );

  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({ message: `Role updated to ${role}`, user });
});

// Moderator route to delete message
app.delete('/api/moderation/messages/:messageId', authenticate, isModeratorOrAdmin, async (req, res) => {
  const { messageId } = req.params;
  const Message = require('./models/Message');
  const message = await Message.findByIdAndDelete(messageId);
  if (!message) return res.status(404).json({ error: 'Message not found' });
  res.json({ message: 'Message deleted' });
});

// Moderator route to block/unblock user
app.put('/api/moderation/block-user', authenticate, isModeratorOrAdmin, async (req, res) => {
  const { userId, blocked } = req.body;
  const User = require('./models/User');
  const user = await User.findByIdAndUpdate(userId, { blocked }, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ message: `User ${blocked ? 'blocked' : 'unblocked'}`, user });
});

// Хранение соответствия userId -> socketId для уведомлений
const userSockets = new Map();

// Делаем io доступным для routes
app.set('io', io);
app.set('userSockets', userSockets);

// Socket.IO для real-time чатов и звонков
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Регистрируем пользователя при подключении
  socket.on('registerUser', (userId) => {
    userSockets.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);

    // Send current online users to the newly connected user
    const onlineUsers = Array.from(userSockets.keys());
    socket.emit('onlineUsers', onlineUsers);

    // Notify all users that this user is online
    io.emit('userOnline', userId);
  });

  socket.on('joinRoom', (room) => {
    socket.join(room);
  });

  socket.on('sendMessage', (data) => {
    io.to(data.room).emit('receiveMessage', data);
  });

  socket.on('startTyping', (data) => {
    socket.to(data.chatId).emit('userTyping', {
      chatId: data.chatId,
      user: data.user
    });
  });

  socket.on('stopTyping', (data) => {
    socket.to(data.chatId).emit('userStopTyping', {
      chatId: data.chatId
    });
  });

  // WebRTC signaling
  socket.on('callUser', (data) => {
    io.to(data.userToCall).emit('callUser', { signal: data.signalData, from: socket.id });
  });

  socket.on('answerCall', (data) => {
    io.to(data.to).emit('callAccepted', data.signal);
  });

  // Обработка авто-принятия запросов в друзья для тестового пользователя
  socket.on('friendRequest', async (data) => {
    try {
      const { chat, fromUser } = data;

      // Проверяем, является ли получатель тестовым пользователем
      if (global.testUserId && chat.participants.some(p => p._id === global.testUserId)) {
        console.log('Test user auto-accepting friend request from:', fromUser.name);

        // Отправляем уведомление отправителю о принятии
        const senderSocketId = userSockets.get(fromUser._id);
        if (senderSocketId) {
          io.to(senderSocketId).emit('friendAccepted', {
            chat: chat,
            acceptedBy: {
              _id: global.testUserId,
              name: 'Test User (Auto-Accept)'
            }
          });
        }

        console.log('Friend request auto-accepted for test user');
      }
    } catch (error) {
      console.error('Error handling friend request for test user:', error);
    }
  });

  socket.on('disconnect', () => {
    // Удаляем пользователя из мапы при отключении
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        console.log(`User ${userId} disconnected`);
        // Notify all users that this user is offline
        io.emit('userOffline', userId);
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

// Catch-all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));