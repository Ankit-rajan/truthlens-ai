const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Resolves a bearer/cookie access token into req.user + res.locals.currentUser.
// The historical ".env admin login" bypass (decoded.id === 'admin') has been
// removed entirely — admin is now a real MongoDB user with role: 'admin',
// seeded by utils/seedAdmin.js, and goes through the exact same verification
// path (including tokenVersion + status checks) as every other account.
async function resolveUser(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id).select("-password");
  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  // tokenVersion lets us invalidate every access/refresh token already
  // issued to this user in one shot (password change, role change, ban).
  if (typeof decoded.tokenVersion === "number" && decoded.tokenVersion !== user.tokenVersion) {
    const err = new Error("Token has been revoked");
    err.code = "TOKEN_REVOKED";
    throw err;
  }

  if (user.status === "banned") {
    const err = new Error("This account has been banned");
    err.code = "USER_BANNED";
    throw err;
  }

  if (user.status === "suspended") {
    const err = new Error("This account is temporarily suspended");
    err.code = "USER_SUSPENDED";
    throw err;
  }

  return user;
}

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Not authorized, no token" });
  }

  try {
    const user = await resolveUser(token);
    req.user = user;
    res.locals.currentUser = user;
    next();
  } catch (error) {
    if (error.code === "USER_BANNED" || error.code === "USER_SUSPENDED") {
      return res.status(403).json({ success: false, message: error.message });
    }
    return res
      .status(401)
      .json({ success: false, message: "Not authorized, token failed" });
  }
};

// Backward-compatible alias — new code should prefer requireRole('admin')
// from middleware/rbac.js, but this stays for existing route definitions.
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ success: false, message: "Admin access required" });
  }
};

// For page routes (viewRoutes): redirect to /login instead of returning raw JSON,
// since a browser navigating to e.g. /dashboard should never see a JSON error body.
exports.protectPage = async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.redirect(
      `/login?redirect=${encodeURIComponent(req.originalUrl)}`,
    );
  }

  try {
    const user = await resolveUser(token);
    req.user = user;
    res.locals.currentUser = user;
    next();
  } catch (error) {
    if (error.code === "USER_BANNED" || error.code === "USER_SUSPENDED") {
      res.clearCookie("token");
      res.clearCookie("refreshToken");
      return res.status(403).render("403", {
        user: null,
        message: error.message
      });
    }
    return res.redirect("/login");
  }
};

// For public page routes: populate req.user if a valid token exists,
// but never block the request when it doesn't (e.g. homepage, trending).
exports.optionalAuth = async (req, res, next) => {
  const token = (req.cookies && req.cookies.token) || null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const user = await resolveUser(token);
    req.user = user;
    res.locals.currentUser = user;
  } catch (error) {
    req.user = null;
  }
  next();
};
