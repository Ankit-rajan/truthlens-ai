require('dotenv').config();
require('./utils/validateEnv')();

const app = require('./app');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 TruthLens server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

// Graceful shutdown — important for zero-downtime deploys on
// Render/Railway/Docker, which send SIGTERM and wait a grace period before
// force-killing the container.
const shutdown = (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  // Force-exit if connections don't close in time.
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
