const mongoose = require('mongoose');

// Powers the admin Security tab: login history, failed logins, admin actions,
// and the general activity timeline. Kept as a single flexible collection
// rather than several so the timeline can be queried/sorted in one place.
const auditLogSchema = new mongoose.Schema({
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null for e.g. failed logins with an unknown/invalid email
  },
  actorEmail: {
    type: String,
    default: null
  },
  actorRole: {
    type: String,
    enum: ['user', 'admin', null],
    default: null
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login_success',
      'login_failed',
      'logout',
      'register',
      'password_reset_requested',
      'password_reset_completed',
      'email_verified',
      'user_role_changed',
      'user_status_changed',
      'user_updated',
      'user_deleted',
      'user_password_reset_by_admin',
      'news_created',
      'news_updated',
      'news_deleted',
      'news_status_changed',
      'report_resolved',
      'report_reviewed',
      'report_deleted',
      'settings_updated',
      'admin_seeded'
    ]
  },
  targetType: {
    type: String,
    enum: ['User', 'TrendingNews', 'ContentReport', 'Settings', null],
    default: null
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ip: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
