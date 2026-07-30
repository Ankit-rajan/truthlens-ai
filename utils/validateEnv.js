// Fails fast on missing required config instead of limping along and
// throwing a confusing error the first time a request needs Mongo/JWT/etc.
const REQUIRED = ['MONGODB_URI', 'JWT_SECRET'];

const RECOMMENDED = [
  'JWT_REFRESH_SECRET',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'GROQ_API_KEY',
  'EMAIL_USER',
  'EMAIL_PASS'
];

function validateEnv() {
  const missingRequired = REQUIRED.filter((key) => !process.env[key]);

  if (missingRequired.length) {
    console.error('❌ Missing required environment variables:', missingRequired.join(', '));
    console.error('   Copy .env.example to .env and fill these in before starting the server.');
    process.exit(1);
  }

  const missingRecommended = RECOMMENDED.filter((key) => !process.env[key]);
  if (missingRecommended.length) {
    console.warn('⚠️  Missing recommended environment variables:', missingRecommended.join(', '));
    console.warn('   The app will still start, but related features (admin seed, AI analysis, email) will be degraded.');
  }

  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    console.warn('⚠️  JWT_SECRET and JWT_REFRESH_SECRET are identical. Use two different values in production.');
  }
}

module.exports = validateEnv;
