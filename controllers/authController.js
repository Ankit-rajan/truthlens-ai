const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const emailService = require('../services/emailService');
const crypto = require('crypto');
const { recordAudit } = require('../utils/auditLog');

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------
// Two-token setup: a short-lived access token (what `protect`/`protectPage`
// verify on every request) and a longer-lived refresh token (only ever sent
// to POST /api/auth/refresh-token). Both embed tokenVersion so that bumping
// User.tokenVersion instantly invalidates every token issued before that
// point — used on password change, role change, and ban/suspend.
const ACCESS_EXPIRE = process.env.JWT_ACCESS_EXPIRE || process.env.JWT_EXPIRE || '15m';
const REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '7d';

const signAccessToken = (user) =>
  jwt.sign({ id: user._id, tokenVersion: user.tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_EXPIRE
  });

const signRefreshToken = (user) =>
  jwt.sign(
    { id: user._id, tokenVersion: user.tokenVersion },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: REFRESH_EXPIRE }
  );

const accessCookieOptions = () => ({
  maxAge: 15 * 60 * 1000,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax'
});

const refreshCookieOptions = () => ({
  maxAge: 7 * 24 * 60 * 60 * 1000,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth' // only ever sent back to auth routes
});

const sendTokenResponse = (user, statusCode, res) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  res.cookie('token', accessToken, accessCookieOptions());
  res.cookie('refreshToken', refreshToken, refreshCookieOptions());

  res.status(statusCode).json({
    success: true,
    token: accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      photo: user.photo,
      isVerified: user.isVerified
    }
  });
};

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    user = await User.create({ name, email, password });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = verificationToken; // reused field for the email-verify flow too
    user.resetPasswordExpire = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    // Never let a flaky mail provider block registration.
    emailService.sendVerificationEmail(user, verificationToken).catch((err) =>
      console.error('Failed to send verification email:', err.message)
    );

    await recordAudit({ req, actor: user, action: 'register' });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
// NOTE: the previous implementation had a hard-coded bypass here that
// authenticated `ADMIN_EMAIL`/`ADMIN_PASSWORD` straight against .env values
// and minted a token for a fake id: "admin" user that didn't exist in
// MongoDB. That bypass has been removed entirely. The admin account is a
// normal MongoDB user (role: 'admin', auto-seeded by utils/seedAdmin.js) and
// authenticates through the exact same path as everyone else.
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      if (user) {
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        await user.save();
      }
      await recordAudit({ req, actor: user || null, action: 'login_failed', actorEmailOverride: email });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.status === 'banned') {
      await recordAudit({ req, actor: user, action: 'login_failed', details: { reason: 'banned' } });
      return res.status(403).json({ success: false, message: 'This account has been banned.' });
    }

    if (user.status === 'suspended') {
      await recordAudit({ req, actor: user, action: 'login_failed', details: { reason: 'suspended' } });
      return res.status(403).json({ success: false, message: 'This account is temporarily suspended.' });
    }

    user.failedLoginAttempts = 0;
    user.lastLogin = new Date();
    await user.save();

    await recordAudit({ req, actor: user, action: 'login_success' });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ---------------------------------------------------------------------------
// Refresh access token using the httpOnly refresh cookie
// ---------------------------------------------------------------------------
exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies && req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No refresh token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || (typeof decoded.tokenVersion === 'number' && decoded.tokenVersion !== user.tokenVersion)) {
      res.clearCookie('token');
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(401).json({ success: false, message: 'Refresh token invalid or expired' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is not active' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Refresh token invalid or expired' });
  }
};

exports.logout = async (req, res) => {
  res.cookie('token', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
  res.cookie('refreshToken', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true, path: '/api/auth' });
  if (req.user) {
    await recordAudit({ req, actor: req.user, action: 'logout' });
  }
  res.status(200).json({ success: true, message: 'Logged out' });
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('history');
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user.id);
    if (name) user.name = name;
    if (email) user.email = email;
    await user.save();
    await recordAudit({ req, actor: user, action: 'user_updated', targetType: 'User', targetId: user._id });
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }
    const user = await User.findById(req.user.id).select('+password');
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    user.tokenVersion += 1; // log out every other session
    await user.save();
    await recordAudit({ req, actor: user, action: 'password_reset_completed', targetType: 'User', targetId: user._id });
    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const cloudinary = require('../config/cloudinary');
const fs = require('fs');

exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    let photoUrl;
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'truthlens/profiles',
        width: 200,
        height: 200,
        crop: 'fill'
      });
      photoUrl = result.secure_url;
      fs.unlinkSync(req.file.path);
    } else {
      photoUrl = `/uploads/${req.file.filename}`;
    }

    const user = await User.findById(req.user.id);
    user.photo = photoUrl;
    await user.save();

    res.status(200).json({ success: true, photoUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Photo upload failed' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      // Don't reveal whether the email exists.
      return res.status(200).json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 min
    await user.save();

    await emailService.sendResetPasswordEmail(user, resetToken);
    await recordAudit({ req, actor: user, action: 'password_reset_requested' });

    res.status(200).json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.tokenVersion += 1; // invalidate any tokens issued before the reset
    await user.save();

    await recordAudit({ req, actor: user, action: 'password_reset_completed' });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }
    user.isVerified = true;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    await recordAudit({ req, actor: user, action: 'email_verified' });
    res.redirect('/login?verified=true');
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
