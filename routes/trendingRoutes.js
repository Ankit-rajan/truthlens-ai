const express = require('express');
const router = express.Router();
const trendingController = require('../controllers/trendingController');

// GET /api/trending - Get trending news with filters
router.get('/', trendingController.getTrending);

// GET /api/trending/:id - Get single trending news
router.get('/:id', trendingController.getTrendingById);

module.exports = router;