const { connect, closeDatabase, clearDatabase } = require('../dbSetup');
const User = require('../../models/User');

beforeAll(async () => connect());
afterEach(async () => clearDatabase());
afterAll(async () => closeDatabase());

describe('User model', () => {
  test('hashes the password on save and never stores it in plaintext', async () => {
    const user = await User.create({ name: 'Ada', email: 'ada@example.com', password: 'plaintext123' });
    expect(user.password).not.toBe('plaintext123');
  });

  test('matchPassword returns true for the correct password and false otherwise', async () => {
    await User.create({ name: 'Ada', email: 'ada2@example.com', password: 'correct-password' });
    const user = await User.findOne({ email: 'ada2@example.com' }).select('+password');

    await expect(user.matchPassword('correct-password')).resolves.toBe(true);
    await expect(user.matchPassword('wrong-password')).resolves.toBe(false);
  });

  test('defaults status to active and tokenVersion to 0 for a new user', async () => {
    const user = await User.create({ name: 'Grace', email: 'grace@example.com', password: 'password123' });
    expect(user.status).toBe('active');
    expect(user.tokenVersion).toBe(0);
    expect(user.role).toBe('user');
  });

  test('rejects a duplicate email', async () => {
    await User.create({ name: 'Alex', email: 'dup@example.com', password: 'password123' });
    await expect(
      User.create({ name: 'B', email: 'dup@example.com', password: 'password123' })
    ).rejects.toThrow();
  });
});
