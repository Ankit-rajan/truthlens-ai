const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const trendingController = require('../controllers/trendingController');

router.get('/stats', protect, admin, adminController.getDashboardStats);
router.get('/users', protect, admin, adminController.getUsers);
router.delete('/users/:id', protect, admin, adminController.deleteUser);
router.delete('/reports/:id', protect, admin, adminController.deleteReport);
router.get('/analytics', protect, admin, adminController.getAnalytics);

// Trending management
router.post('/trending', protect, admin, trendingController.addTrending);
router.delete('/trending/:id', protect, admin, trendingController.deleteTrending);

module.exports = router;