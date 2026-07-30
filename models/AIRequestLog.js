const mongoose = require('mongoose');

// One row per call into aiService.analyzeNews(), regardless of caller
// (manual analyze, trending ingestion, etc). Powers the admin AI Management
// tab: requests today, success rate, error rate, avg confidence, provider
// breakdown, latency.
const aiRequestLogSchema = new mongoose.Schema({
  provider: {
    type: String,
    enum: ['groq', 'gemini'],
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'error'],
    required: true
  },
  verdict: {
    type: String,
    default: null
  },
  confidence: {
    type: Number,
    default: null
  },
  latencyMs: {
    type: Number,
    default: null
  },
  errorMessage: {
    type: String,
    default: null
  },
  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  source: {
    type: String,
    enum: ['analyze', 'trending', 'other'],
    default: 'analyze'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

aiRequestLogSchema.index({ createdAt: -1 });
aiRequestLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('AIRequestLog', aiRequestLogSchema);
