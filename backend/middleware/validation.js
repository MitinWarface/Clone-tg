const Joi = require('joi');

// Validation schemas
const emailSchema = Joi.string().email().required();
const usernameSchema = Joi.string().min(3).max(30).pattern(/^[a-zA-Z0-9_]+$/).required();
const passwordSchema = Joi.string().min(6).max(100).required();
const otpSchema = Joi.string().length(6).pattern(/^\d+$/).required();
const nameSchema = Joi.string().min(1).max(50).trim().required();
const statusSchema = Joi.string().valid('Доступен', 'Занят', 'Не беспокоить', 'Оффлайн').required();

// Middleware functions
const validateEmail = (req, res, next) => {
  const { error } = emailSchema.validate(req.body.email);
  if (error) return res.status(400).json({ error: 'Invalid email format' });
  next();
};

const validateUsername = (req, res, next) => {
  const { error } = usernameSchema.validate(req.body.username);
  if (error) return res.status(400).json({ error: 'Invalid username format (3-30 chars, letters/numbers/underscore only)' });
  next();
};

const validatePassword = (req, res, next) => {
  const { error } = passwordSchema.validate(req.body.password);
  if (error) return res.status(400).json({ error: 'Password must be 6-100 characters long' });
  next();
};

const validateOTP = (req, res, next) => {
  const { error } = otpSchema.validate(req.body.otp);
  if (error) return res.status(400).json({ error: 'Invalid OTP format' });
  next();
};

const validateName = (req, res, next) => {
  const { error } = nameSchema.validate(req.body.name);
  if (error) return res.status(400).json({ error: 'Invalid name format' });
  next();
};

const validateStatus = (req, res, next) => {
  if (req.body.profile && req.body.profile.status) {
    const { error } = statusSchema.validate(req.body.profile.status);
    if (error) return res.status(400).json({ error: 'Invalid status value' });
  }
  next();
};

module.exports = {
  validateEmail,
  validateUsername,
  validatePassword,
  validateOTP,
  validateName,
  validateStatus
};