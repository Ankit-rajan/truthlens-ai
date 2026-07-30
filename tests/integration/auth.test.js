const request = require('supertest');
const { connect, closeDatabase, clearDatabase } = require('../dbSetup');

let app;

beforeAll(async () => {
  await connect();
  app = require('../../app'); // required after the DB is connected (NODE_ENV=test skips app.js's own connectDB call)
});
afterEach(async () => clearDatabase());
afterAll(async () => closeDatabase());

describe('GET /health', () => {
  test('responds 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Auth flow', () => {
  test('register -> login -> /api/auth/me works end to end', async () => {
    const email = 'flow@example.com';

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Flow Test', email, password: 'password123' });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.success).toBe(true);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'password123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTruthy();

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(email);
  });

  test('login fails with wrong password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Flow Test', email: 'wrongpw@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrongpw@example.com', password: 'nope' });

    expect(res.status).toBe(401);
  });
});

describe('Admin route RBAC', () => {
  test('a regular user is rejected from /api/admin/stats', async () => {
    const email = 'regularuser@example.com';
    await request(app).post('/api/auth/register').send({ name: 'Regular', email, password: 'password123' });
    const loginRes = await request(app).post('/api/auth/login').send({ email, password: 'password123' });

    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    expect(res.status).toBe(403);
  });

  test('an unauthenticated request is rejected from /api/admin/stats', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });
});
