const jwt = require("jsonwebtoken");
const User = require("../models/User");

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Temporary .env admin support
    if (decoded.id === "admin" && decoded.role === "admin") {
      req.user = {
        id: "admin",
        name: "Administrator",
        email: process.env.ADMIN_EMAIL,
        role: "admin",
      };

      res.locals.currentUser = req.user;
      return next();
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user;
    res.locals.currentUser = user;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Not authorized, token failed" });
  }
};

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Temporary .env admin support
    if (decoded.id === "admin" && decoded.role === "admin") {
      req.user = {
        id: "admin",
        name: "Administrator",
        email: process.env.ADMIN_EMAIL,
        role: "admin",
      };

      res.locals.currentUser = req.user;
      return next();
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.redirect("/login");
    }

    req.user = user;
    res.locals.currentUser = user;
    next();
  } catch (error) {
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    req.user = user || null;
    res.locals.currentUser = req.user;
  } catch (error) {
    req.user = null;
  }
  next();
};
