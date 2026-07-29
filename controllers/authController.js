const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const emailService = require('../services/emailService');
const crypto = require('crypto');

// Generate JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  };
  res.cookie('token', token, cookieOptions);
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      photo: user.photo
    }
  });
};

exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    user = await User.create({ name, email, password });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = verificationToken; // reuse field for simplicity
    user.resetPasswordExpire = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    // Send verification email (mock)
    await emailService.sendVerificationEmail(user, verificationToken);

    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

// Admin Login
if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
) {
    const token = jwt.sign(
        {
            id: "admin",
            role: "admin"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );

    return res.status(200).json({
        success: true,
        token,
        user: {
            id: "admin",
            name: "Administrator",
            email: process.env.ADMIN_EMAIL,
            role: "admin"
        }
    });
}


    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.logout = (req, res) => {
  res.cookie('token', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
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
    res.status(200).json({ success: true, user });
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

    // Upload to Cloudinary or local
    let photoUrl;
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      // Cloudinary upload
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'truthlens/profiles',
        width: 200,
        height: 200,
        crop: 'fill'
      });
      photoUrl = result.secure_url;
      // Remove local file
      fs.unlinkSync(req.file.path);
    } else {
      // Local storage
      photoUrl = `/uploads/${req.file.filename}`;
    }

    // Update user
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
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 min
    await user.save();

    await emailService.sendResetPasswordEmail(user, resetToken);

    res.status(200).json({ success: true, message: 'Reset email sent' });
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
    await user.save();

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
    res.redirect('/login?verified=true');
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};