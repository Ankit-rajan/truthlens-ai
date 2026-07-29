const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  newsHistory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NewsHistory',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pdfPath: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Report', reportSchema);