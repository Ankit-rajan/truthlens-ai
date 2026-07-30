const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize, requireActiveUser } = require('../middleware/rbac');
const adminController = require('../controllers/adminController');

// Every route below requires: valid token -> active (non-banned/suspended)
// account -> role === 'admin'. Applied once here instead of per-route.
router.use(protect, requireActiveUser, authorize('admin'));

// Dashboard
router.get('/stats', adminController.getDashboardStats);
router.get('/analytics', adminController.getAnalytics);

// Users management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetail);
router.put('/users/:id', adminController.updateUser);
router.put('/users/:id/role', adminController.updateUserRole);
router.put('/users/:id/status', adminController.updateUserStatus);
router.put('/users/:id/reset-password', adminController.resetUserPassword);
router.delete('/users/:id', adminController.deleteUser);

// News management
router.get('/news', adminController.getNewsList);
router.post('/news', adminController.createNews);
router.put('/news/:id', adminController.updateNews);
router.put('/news/:id/status', adminController.updateNewsStatus);
router.delete('/news/:id', adminController.deleteNews);

// Categories
router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.createCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// Content reports moderation
router.get('/reports', adminController.getReports);
router.put('/reports/:id', adminController.updateReportStatus);
router.delete('/reports/:id', adminController.deleteReport);

// AI management
router.get('/ai/stats', adminController.getAIStats);

// Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Security / audit
router.get('/security/logs', adminController.getAuditLogs);

module.exports = router;
