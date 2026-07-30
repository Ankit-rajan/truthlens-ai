const jwt = require('jsonwebtoken');
const Settings = require('../models/Settings');
const User = require('../models/User');

let cache = { maintenanceMode: false, maintenanceMessage: '', fetchedAt: 0 };
const CACHE_TTL_MS = 30 * 1000;

async function getSettingsCached() {
  if (Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache;
  try {
    const settings = await Settings.findOne({ key: 'global' }).lean();
    cache = {
      maintenanceMode: settings ? !!settings.maintenanceMode : false,
      maintenanceMessage: settings ? settings.maintenanceMessage : '',
      fetchedAt: Date.now()
    };
  } catch (err) {
    // If Mongo is briefly unavailable, fail open on the cached value rather
    // than 500ing every request.
  }
  return cache;
}

// Best-effort admin check used only on the (rare) path where maintenance
// mode is actually on. Deliberately not a full `protect` middleware run
// globally for every request just to support this one feature.
async function isAdminRequest(req) {
  const token = req.cookies && req.cookies.token;
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('role status');
    return !!(user && user.role === 'admin' && user.status === 'active');
  } catch (err) {
    return false;
  }
}

// Health checks, auth routes (so an admin can still log in), and the admin
// UI/API always pass through regardless of maintenance mode.
const ALWAYS_ALLOWED_PREFIXES = ['/health', '/api/health', '/api/auth', '/admin', '/api/admin', '/css', '/js', '/images', '/uploads'];

module.exports = async function maintenanceMode(req, res, next) {
  if (ALWAYS_ALLOWED_PREFIXES.some((p) => req.path.startsWith(p))) return next();

  const settings = await getSettingsCached();
  if (!settings.maintenanceMode) return next();

  if (await isAdminRequest(req)) return next();

  if (req.path.startsWith('/api/')) {
    return res.status(503).json({
      success: false,
      message: settings.maintenanceMessage || 'Service temporarily unavailable for maintenance.'
    });
  }

  return res.status(503).render('maintenance', {
    message: settings.maintenanceMessage || 'Service temporarily unavailable for maintenance.',
    user: null,
    title: 'Under Maintenance'
  });
};
