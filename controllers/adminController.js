const User = require('../models/User');
const NewsHistory = require('../models/NewsHistory');
const TrendingNews = require('../models/TrendingNews');

exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAnalyses = await NewsHistory.countDocuments();
    const totalTrending = await TrendingNews.countDocuments();
    // Additional stats: predictions breakdown
    const predictions = await NewsHistory.aggregate([
      { $group: { _id: '$prediction', count: { $sum: 1 } } }
    ]);
    res.status(200).json({
      success: true,
      stats: { totalUsers, totalAnalyses, totalTrending, predictions }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    await NewsHistory.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Report deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    // Monthly analysis counts
    const monthly = await NewsHistory.aggregate([
      {
        $group: {
          _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    res.status(200).json({ success: true, monthly });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};