const validator = require('validator');

exports.validateEmail = (email) => {
  return validator.isEmail(email);
};

exports.validatePassword = (password) => {
  return password.length >= 6;
};

exports.validateName = (name) => {
  return name && name.length >= 2 && name.length <= 50;
};

exports.sanitizeString = (str) => {
  return validator.escape(str.trim());
};

exports.isValidUrl = (url) => {
  return validator.isURL(url);
};

// Format date
exports.formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Truncate text
exports.truncate = (text, length = 100) => {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

// Generate random string
exports.generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Check if object is empty
exports.isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

// Get color for prediction
exports.getPredictionColor = (prediction) => {
  const map = {
    'True': 'success',
    'Partially True': 'warning',
    'Likely Fake': 'danger',
    'Fake': 'danger'
  };
  return map[prediction] || 'secondary';
};

// Get icon for prediction
exports.getPredictionIcon = (prediction) => {
  const map = {
    'True': 'fa-check-circle',
    'Partially True': 'fa-minus-circle',
    'Likely Fake': 'fa-exclamation-circle',
    'Fake': 'fa-times-circle'
  };
  return map[prediction] || 'fa-question-circle';
};