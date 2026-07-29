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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

module.exports = mongoose.model('TrendingNews', trendingNewsSchema);