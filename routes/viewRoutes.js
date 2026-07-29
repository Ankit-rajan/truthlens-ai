const express = require('express');
const router = express.Router();
const { protectPage, optionalAuth } = require('../middleware/auth');
const TrendingNews = require('../models/TrendingNews');
const NewsHistory = require('../models/NewsHistory');

// Home
router.get('/', optionalAuth, async (req, res) => {
  try {
    const trending = await TrendingNews.find().sort({ createdAt: -1 }).limit(3);
    res.render('index', { trending, user: req.user || null });
  } catch (error) {
    res.render('index', { trending: [], user: req.user || null });
  }
});

// Analyze page
router.get('/analyze', protectPage, (req, res) => {
  res.render('analyze', { user: req.user });
});

// Trending page
router.get('/trending', optionalAuth, async (req, res) => {
  try {
    const { category, search } = req.query;
    let filter = {};
    if (category && category !== 'All') filter.category = category;
    if (search) filter.title = { $regex: search, $options: 'i' };
    const trending = await TrendingNews.find(filter).sort({ createdAt: -1 });
    res.render('trending', { trending, user: req.user, filters: { category, search } });
  } catch (error) {
    res.render('trending', { trending: [], user: req.user, filters: {} });
  }
});

// Dashboard
router.get('/dashboard', protectPage, async (req, res) => {
  try {
    const history = await NewsHistory.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(10);
    const bookmarks = await NewsHistory.find({ _id: { $in: req.user.bookmarks } });
    res.render('dashboard', { user: req.user, history, bookmarks });
  } catch (error) {
    res.render('dashboard', { user: req.user, history: [], bookmarks: [] });
  }
});

// History
router.get('/history', protectPage, async (req, res) => {
  try {
    const history = await NewsHistory.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.render('history', { user: req.user, history });
  } catch (error) {
    res.render('history', { user: req.user, history: [] });
  }
});

// Profile
router.get('/profile', protectPage, (req, res) => {
  res.render('profile', { user: req.user });
});

// Login
router.get('/login', optionalAuth, (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.render('login', { user: null });
});

// Signup
router.get('/signup', optionalAuth, (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.render('signup', { user: null });
});

// Report view (single)
router.get('/report/:id', protectPage, async (req, res) => {
  try {
    const report = await NewsHistory.findOne({ _id: req.params.id, user: req.user.id });
    if (!report) return res.status(404).render('404', { user: req.user });
    res.render('report', { user: req.user, report });
  } catch (error) {
    res.status(500).render('500', { user: req.user });
  }
});

// Admin routes
router.get('/admin/dashboard', protectPage, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).render('403', { user: req.user });
  res.render('admin/dashboard', { user: req.user });
});
router.get('/admin/users', protectPage, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).render('403', { user: req.user });
  res.render('admin/users', { user: req.user });
});
router.get('/admin/trending', protectPage, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).render('403', { user: req.user });
  res.render('admin/trending', { user: req.user });
});

// 404
router.use(optionalAuth, (req, res) => {
  res.status(404).render('404', { user: req.user || null });
});


// Change password page
router.get('/change-password', protectPage, (req, res) => {
  res.render('change-password', { user: req.user });
});

// Forgot password page
router.get('/forgot-password', optionalAuth, (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.render('forgot-password', { user: null });
});

// Reset password page
router.get('/reset-password', optionalAuth, (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  const { token } = req.query;
  res.render('reset-password', { user: null, token });
});


module.exports = router;