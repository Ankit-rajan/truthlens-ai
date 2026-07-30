const User = require('../models/User');
const NewsHistory = require('../models/NewsHistory');
const TrendingNews = require('../models/TrendingNews');
const ContentReport = require('../models/ContentReport');
const AIRequestLog = require('../models/AIRequestLog');
const AuditLog = require('../models/AuditLog');
const Settings = require('../models/Settings');
const Category = require('../models/Category');
const { recordAudit } = require('../utils/auditLog');

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
exports.getDashboardStats = async (req, res) => {
  try {
    const today = startOfToday();

    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      totalAnalyses,
      totalTrending,
      totalReports,
      pendingReports,
      predictions,
      aiRequestsToday,
      aiSuccessToday,
      aiErrorsToday
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ createdAt: { $gte: today } }),
      NewsHistory.countDocuments(),
      TrendingNews.countDocuments(),
      ContentReport.countDocuments(),
      ContentReport.countDocuments({ status: 'pending' }),
      NewsHistory.aggregate([{ $group: { _id: '$prediction', count: { $sum: 1 } } }]),
      AIRequestLog.countDocuments({ createdAt: { $gte: today } }),
      AIRequestLog.countDocuments({ createdAt: { $gte: today }, status: 'success' }),
      AIRequestLog.countDocuments({ createdAt: { $gte: today }, status: 'error' })
    ]);

    const fakeCount = predictions
      .filter((p) => p._id === 'Fake' || p._id === 'Likely Fake')
      .reduce((sum, p) => sum + p.count, 0);
    const realCount = predictions
      .filter((p) => p._id === 'True' || p._id === 'Partially True')
      .reduce((sum, p) => sum + p.count, 0);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        newUsersToday,
        totalAnalyses,
        totalTrending,
        totalReports,
        pendingReports,
        fakeCount,
        realCount,
        predictions,
        ai: {
          requestsToday: aiRequestsToday,
          successToday: aiSuccessToday,
          errorsToday: aiErrorsToday,
          successRate: aiRequestsToday ? Math.round((aiSuccessToday / aiRequestsToday) * 100) : 100
        },
        systemHealth: {
          dbConnected: true,
          uptimeSeconds: Math.round(process.uptime()),
          nodeEnv: process.env.NODE_ENV || 'development'
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ---------------------------------------------------------------------------
// Users management
// ---------------------------------------------------------------------------
exports.getUsers = async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role && role !== 'All') filter.role = role;
    if (status && status !== 'All') filter.status = status;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      User.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      users,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate({ path: 'history', options: { sort: { createdAt: -1 }, limit: 20 } })
      .populate({ path: 'bookmarks', options: { sort: { createdAt: -1 }, limit: 20 } });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const reports = await ContentReport.find({ reporter: user._id }).sort({ createdAt: -1 }).limit(20);

    res.status(200).json({ success: true, user, reports });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (name) user.name = name;
    if (email) user.email = email;
    await user.save();

    await recordAudit({ req, actor: req.user, action: 'user_updated', targetType: 'User', targetId: user._id, details: { name, email } });

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Guard against an admin locking themselves (or the last admin) out.
    if (user._id.equals(req.user.id) && role !== 'admin') {
      return res.status(400).json({ success: false, message: 'You cannot remove your own admin role' });
    }
    if (user.role === 'admin' && role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot demote the only remaining admin' });
      }
    }

    const previousRole = user.role;
    user.role = role;
    user.tokenVersion += 1; // force re-login so the new role takes effect immediately
    await user.save();

    await recordAudit({
      req,
      actor: req.user,
      action: 'user_role_changed',
      targetType: 'User',
      targetId: user._id,
      details: { from: previousRole, to: role }
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body; // active | suspended | banned
    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user._id.equals(req.user.id)) {
      return res.status(400).json({ success: false, message: 'You cannot change your own account status' });
    }
    if (user.role === 'admin' && status !== 'active') {
      return res.status(400).json({ success: false, message: 'Demote this admin before suspending/banning them' });
    }

    const previousStatus = user.status;
    user.status = status;
    user.tokenVersion += 1; // immediately invalidate any active sessions
    await user.save();

    await recordAudit({
      req,
      actor: req.user,
      action: 'user_status_changed',
      targetType: 'User',
      targetId: user._id,
      details: { from: previousStatus, to: status }
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.params.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = newPassword;
    user.tokenVersion += 1;
    await user.save();

    await recordAudit({
      req,
      actor: req.user,
      action: 'user_password_reset_by_admin',
      targetType: 'User',
      targetId: user._id
    });

    res.status(200).json({ success: true, message: 'Password reset' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot delete the only remaining admin' });
      }
    }

    await user.deleteOne();

    await recordAudit({ req, actor: req.user, action: 'user_deleted', targetType: 'User', targetId: id, details: { email: user.email } });

    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ---------------------------------------------------------------------------
// News (TrendingNews) management
// ---------------------------------------------------------------------------
exports.getNewsList = async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const filter = {};
    if (status && status !== 'All') filter.status = status;
    if (category && category !== 'All') filter.category = category;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const news = await TrendingNews.find(filter).sort({ createdAt: -1 }).populate('createdBy', 'name email');
    res.status(200).json({ success: true, news });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createNews = async (req, res) => {
  try {
    const { title, description, content, prediction, category, source, image, featured } = req.body;

    if (!title || !category) {
      return res.status(400).json({ success: false, message: 'Title and category are required' });
    }

    const news = await TrendingNews.create({
      title,
      description,
      content,
      prediction: prediction || 'Fake',
      category,
      source,
      image,
      featured: !!featured,
      status: 'draft',
      createdBy: req.user.id
    });

    await recordAudit({ req, actor: req.user, action: 'news_created', targetType: 'TrendingNews', targetId: news._id, details: { title } });

    res.status(201).json({ success: true, news });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to create news' });
  }
};

exports.updateNews = async (req, res) => {
  try {
    const { title, description, content, prediction, category, source, image, featured } = req.body;
    const news = await TrendingNews.findById(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'Not found' });

    if (title !== undefined) news.title = title;
    if (description !== undefined) news.description = description;
    if (content !== undefined) news.content = content;
    if (prediction !== undefined) news.prediction = prediction;
    if (category !== undefined) news.category = category;
    if (source !== undefined) news.source = source;
    if (image !== undefined) news.image = image;
    if (featured !== undefined) news.featured = !!featured;
    news.updatedAt = new Date();
    await news.save();

    await recordAudit({ req, actor: req.user, action: 'news_updated', targetType: 'TrendingNews', targetId: news._id });

    res.status(200).json({ success: true, news });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to update news' });
  }
};

// Approve / reject / publish / unpublish - one endpoint, driven by the
// target status, since they're all "change status + stamp who/when".
exports.updateNewsStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['draft', 'approved', 'rejected', 'published', 'unpublished'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const news = await TrendingNews.findById(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'Not found' });

    const previousStatus = news.status;
    news.status = status;
    if (['approved', 'published'].includes(status)) {
      news.approvedBy = req.user.id;
      news.approvedAt = new Date();
    }
    news.updatedAt = new Date();
    await news.save();

    await recordAudit({
      req,
      actor: req.user,
      action: 'news_status_changed',
      targetType: 'TrendingNews',
      targetId: news._id,
      details: { from: previousStatus, to: status }
    });

    res.status(200).json({ success: true, news });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteNews = async (req, res) => {
  try {
    const deleted = await TrendingNews.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Not found' });

    await recordAudit({ req, actor: req.user, action: 'news_deleted', targetType: 'TrendingNews', targetId: req.params.id, details: { title: deleted.title } });

    res.status(200).json({ success: true, message: 'Deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to delete news' });
  }
};

// Categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.status(200).json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const category = await Category.create({ name, description });
    res.status(201).json({ success: true, category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ---------------------------------------------------------------------------
// Content reports moderation
// ---------------------------------------------------------------------------
exports.getReports = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== 'All') filter.status = status;

    const reports = await ContentReport.find(filter)
      .sort({ createdAt: -1 })
      .populate('reporter', 'name email')
      .populate('reviewedBy', 'name email');

    res.status(200).json({ success: true, reports });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateReportStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const report = await ContentReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Not found' });

    report.status = status;
    if (adminNote !== undefined) report.adminNote = adminNote;
    report.reviewedBy = req.user.id;
    report.reviewedAt = new Date();
    await report.save();

    await recordAudit({
      req,
      actor: req.user,
      action: status === 'resolved' ? 'report_resolved' : 'report_reviewed',
      targetType: 'ContentReport',
      targetId: report._id,
      details: { status }
    });

    res.status(200).json({ success: true, report });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ContentReport.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Not found' });

    await recordAudit({ req, actor: req.user, action: 'report_deleted', targetType: 'ContentReport', targetId: id });

    res.status(200).json({ success: true, message: 'Report deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ---------------------------------------------------------------------------
// AI management
// ---------------------------------------------------------------------------
exports.getAIStats = async (req, res) => {
  try {
    const today = startOfToday();

    const [requestsToday, successToday, errorToday, avgConfidenceAgg, byProvider, recentErrors] = await Promise.all([
      AIRequestLog.countDocuments({ createdAt: { $gte: today } }),
      AIRequestLog.countDocuments({ createdAt: { $gte: today }, status: 'success' }),
      AIRequestLog.countDocuments({ createdAt: { $gte: today }, status: 'error' }),
      AIRequestLog.aggregate([
        { $match: { status: 'success', confidence: { $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$confidence' } } }
      ]),
      AIRequestLog.aggregate([{ $group: { _id: '$provider', count: { $sum: 1 } } }]),
      AIRequestLog.find({ status: 'error' }).sort({ createdAt: -1 }).limit(10)
    ]);

    res.status(200).json({
      success: true,
      stats: {
        requestsToday,
        successToday,
        errorToday,
        successRate: requestsToday ? Math.round((successToday / requestsToday) * 100) : 100,
        errorRate: requestsToday ? Math.round((errorToday / requestsToday) * 100) : 0,
        avgConfidence: avgConfidenceAgg[0] ? Math.round(avgConfidenceAgg[0].avg) : 0,
        byProvider,
        recentErrors,
        currentProvider: process.env.AI_PROVIDER || 'groq'
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------
exports.getAnalytics = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [monthly, dailyUsers, dailyAnalyses, fakeVsReal, monthlyUserGrowth] = await Promise.all([
      NewsHistory.aggregate([
        { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      NewsHistory.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      NewsHistory.aggregate([{ $group: { _id: '$prediction', count: { $sum: 1 } } }]),
      User.aggregate([
        { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    res.status(200).json({
      success: true,
      monthly,
      dailyUsers,
      dailyAnalyses,
      fakeVsReal,
      monthlyUserGrowth
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ key: 'global' });
    if (!settings) settings = await Settings.create({ key: 'global' });
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const allowed = [
      'siteName', 'siteLogo', 'contactEmail', 'contactPhone', 'supportAddress',
      'aiProvider', 'maintenanceMode', 'maintenanceMessage', 'registrationEnabled'
    ];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });
    updates.updatedBy = req.user.id;
    updates.updatedAt = new Date();

    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $set: updates },
      { new: true, upsert: true }
    );

    await recordAudit({ req, actor: req.user, action: 'settings_updated', targetType: 'Settings', details: updates });

    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ---------------------------------------------------------------------------
// Security / audit
// ---------------------------------------------------------------------------
exports.getAuditLogs = async (req, res) => {
  try {
    const { action, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (action && action !== 'All') filter.action = action;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('actor', 'name email role'),
      AuditLog.countDocuments(filter)
    ]);

    const [failedLoginsToday, loginsToday] = await Promise.all([
      AuditLog.countDocuments({ action: 'login_failed', createdAt: { $gte: startOfToday() } }),
      AuditLog.countDocuments({ action: 'login_success', createdAt: { $gte: startOfToday() } })
    ]);

    res.status(200).json({
      success: true,
      logs,
      summary: { failedLoginsToday, loginsToday },
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
