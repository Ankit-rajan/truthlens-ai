const mongoose = require('mongoose');

const trendingNewsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  content: String,
  prediction: {
    type: String,
    enum: ['Fake', 'Likely Fake', 'Partially True', 'True'],
    default: 'Fake'
  },
  category: {
    type: String,
    enum: ['Politics', 'Health', 'Sports', 'Finance', 'Technology', 'Entertainment'],
    required: true
  },
  source: String,
  image: String,
  // Moderation workflow: draft (just added) -> approved/rejected -> published/unpublished.
  // Only 'published' items should ever surface on the public /trending page.
  status: {
    type: String,
    enum: ['draft', 'approved', 'rejected', 'published', 'unpublished'],
    default: 'draft'
  },
  featured: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

trendingNewsSchema.index({ status: 1, createdAt: -1 });
trendingNewsSchema.index({ category: 1 });
trendingNewsSchema.index({ featured: 1 });

module.exports = mongoose.model('TrendingNews', trendingNewsSchema);