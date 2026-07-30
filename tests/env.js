process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_ci_only';
process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_key_for_ci_only';
// A dummy value so validateEnv's REQUIRED check passes; DB tests that need a
// real connection use mongodb-memory-server instead (see tests/dbSetup.js)
// and override this at runtime via mongoose.connect(uri).
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/truthlens_test';
