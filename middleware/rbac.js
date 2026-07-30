// Generic role gate. Usage: router.get('/x', protect, authorize('admin'), handler)
// Kept separate from auth.js's `admin` export (still exported for backward
// compatibility) so new code can express "any of these roles" cleanly.
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not permitted to perform this action`
      });
    }
    next();
  };
};

// Blocks suspended/banned accounts from using authenticated routes, even if
// their JWT is still technically valid. Applied after `protect`.
exports.requireActiveUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
  if (req.user.status === 'banned') {
    return res.status(403).json({ success: false, message: 'This account has been banned.' });
  }
  if (req.user.status === 'suspended') {
    return res.status(403).json({ success: false, message: 'This account is temporarily suspended.' });
  }
  next();
};
