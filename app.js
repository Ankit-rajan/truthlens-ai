require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const csurf = require('csurf');
const morgan = require('morgan');
const expressLayouts = require('express-ejs-layouts'); // ✅ NEW

// Import routes
const authRoutes = require('./routes/authRoutes');
const newsRoutes = require('./routes/newsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const viewRoutes = require('./routes/viewRoutes');
const trendingRoutes = require('./routes/trendingRoutes');

const app = express();

// Database connection
const connectDB = require('./config/database');
connectDB();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Session
app.use(session({
  secret: process.env.JWT_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24
  }
}));

// CSRF protection — skip for /api routes.
// The frontend JS (login.ejs, signup.ejs, etc.) posts JSON via axios and never
// attaches the _csrf token to those requests, so applying csurf globally made
// every single API POST/PUT/DELETE fail with 403 "invalid csrf token" —
// including login and register. Those routes authenticate via JWT
// (Authorization header or an httpOnly, sameSite=lax cookie), so they don't
// need cookie-based CSRF tokens. Traditional server-rendered forms (if any
// are added later) still get CSRF protection.
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  return csurf({ cookie: true })(req, res, next);
});

// Sanitization
const sanitize = require('express-mongo-sanitize');
app.use(sanitize());

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ✅ Layout engine setup
app.use(expressLayouts);
app.set('layout', 'layout'); // layout.ejs will be used automatically
// NOTE: extractScripts/extractStyles are intentionally OFF.
// layout.ejs has no defineContent('scripts')/defineContent('styles')
// placeholder, so turning these on silently deleted every inline <script>
// (including the login/signup form submit handlers) and <style> block from
// the rendered HTML -- forms then fell back to native browser submission
// (login GET-navigated to /api/auth/login showing raw JSON; signup, having
// no method="POST", GET-submitted with the password exposed in the URL).
app.set('layout extractScripts', false);
app.set('layout extractStyles', false);

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Make user and csrf available in all views
app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
  res.locals.title = 'TruthLens'; // default title
  next();
});

// Routes
// IMPORTANT: API routes must be mounted BEFORE '/' viewRoutes.
// viewRoutes has an internal catch-all (router.use with no path, at the very
// end of routes/viewRoutes.js) that matches every HTTP method on any path it
// doesn't recognize. Since viewRoutes was mounted at '/' first, it swallowed
// every /api/* request (GET and POST alike) as a 404 before Express ever got
// to the /api/auth, /api/news, /api/admin, /api/trending mounts below —
// meaning login, register, and every other API call always 404'd.
app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/trending', trendingRoutes);
app.use('/', viewRoutes);

// Error handling middleware (must be last)
app.use(require('./middleware/errorHandler'));

module.exports = app;