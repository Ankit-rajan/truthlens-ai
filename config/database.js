const mongoose = require('mongoose');
const seedAdmin = require('../utils/seedAdmin');

const connectDB = async () => {
  // Already connected (e.g. a warm serverless container reusing this
  // module) — don't open a second connection.
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    await seedAdmin();
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    if (process.env.NODE_ENV === 'test') throw error;
    process.exit(1);
  }
};

module.exports = connectDB;