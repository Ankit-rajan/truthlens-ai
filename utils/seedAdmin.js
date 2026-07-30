const User = require('../models/User');

/**
 * Ensures exactly one MongoDB user with role: 'admin' exists, matching
 * ADMIN_EMAIL from .env. Safe to call on every server startup — it's a
 * no-op once the admin exists. This replaces the old approach of
 * special-casing ADMIN_EMAIL/ADMIN_PASSWORD directly inside the login
 * handler; the admin is now a completely ordinary MongoDB user (with
 * role: 'admin') that goes through the normal auth path.
 */
async function seedAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn('⚠️  ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin seed. Set both in .env to auto-create an admin.');
    return null;
  }

  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });

  if (existing) {
    // Keep an existing account's role in sync if ADMIN_EMAIL now points at
    // a user that was demoted or was never promoted in the first place.
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      existing.status = 'active';
      await existing.save();
      console.log(`✅ Existing user ${ADMIN_EMAIL} promoted to admin.`);
    }
    return existing;
  }

  const admin = await User.create({
    name: ADMIN_NAME || 'Administrator',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin',
    status: 'active',
    isVerified: true
  });

  console.log(`✅ Admin account created for ${ADMIN_EMAIL}.`);
  return admin;
}

module.exports = seedAdmin;
