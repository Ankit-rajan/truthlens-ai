const mongoose = require('mongoose');

// Singleton document (there is only ever one Settings row, enforced by
// always upserting against key: 'global' in the controller) backing the
// admin Settings page. Secrets (API keys, SMTP password) intentionally stay
// in .env and are NOT duplicated here — this only stores values that are
// safe to read/write from the admin UI.
const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    default: 'global',
    unique: true
  },
  siteName: {
    type: String,
    default: 'TruthLens'
  },
  siteLogo: {
    type: String,
    default: '/images/hero-illustration.svg'
  },
  contactEmail: {
    type: String,
    default: ''
  },
  contactPhone: {
    type: String,
    default: ''
  },
  supportAddress: {
    type: String,
    default: ''
  },
  aiProvider: {
    type: String,
    enum: ['groq', 'gemini'],
    default: 'groq'
  },
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  maintenanceMessage: {
    type: String,
    default: 'TruthLens is undergoing scheduled maintenance. Please check back shortly.'
  },
  registrationEnabled: {
    type: Boolean,
    default: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Settings', settingsSchema);
