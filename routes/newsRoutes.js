const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const newsController = require('../controllers/newsController');
const { sanitizeBody } = require('../middleware/sanitize');

router.post('/detect', protect, sanitizeBody, newsController.detectNews);
router.get('/history', protect, newsController.getHistory);
router.delete('/history/:id', protect, newsController.deleteHistory);
router.post('/bookmark/:id', protect, newsController.bookmark);
router.get('/report/:id', protect, newsController.generateReport);
router.get('/history/export', protect, newsController.exportCSV);
module.exports = router;