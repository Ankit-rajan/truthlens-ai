const mongoose = require('mongoose');

// NOTE: this is deliberately a separate collection from models/Report.js.
// Report.js tracks generated PDF report *downloads* of a user's own
// analysis. ContentReport is the "Reports Management" concept from the
// admin brief: a user flagging a piece of content (an analysis result or a
// trending article) for admin review — wrong verdict, abuse, spam, etc.
const contentReportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetType: {
    type: String,
    enum: ['NewsHistory', 'TrendingNews'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetType'
  },
  reason: {
    type: String,
    enum: ['incorrect_verdict', 'spam', 'offensive', 'misleading', 'other'],
    required: true
  },
  message: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  adminNote: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

contentReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ContentReport', contentReportSchema);
