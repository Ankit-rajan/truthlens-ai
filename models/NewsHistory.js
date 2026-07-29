const mongoose = require('mongoose');

const newsHistorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  prediction: {
    type: String,
    enum: ['Fake', 'Likely Fake', 'Partially True', 'True'],
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  reasons: [String],
  claims: [String],
  evidence: [String],
  bias: String,
  emotionalTone: String,
  clickbaitScore: Number,
  factConsistency: String,
  sourceTrustScore: Number,
  misleadingStatements: [String],
  hallucinationProbability: Number,
  source: {
    url: String,
    domain: String,
    reputation: Number,
    age: String,
    ssl: Boolean,
    country: String,
    blacklisted: Boolean,
    spamScore: Number
  },
  category: {
    type: String,
    enum: ['Politics', 'Health', 'Sports', 'Finance', 'Technology', 'Entertainment', 'Other'],
    default: 'Other'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('NewsHistory', newsHistorySchema);