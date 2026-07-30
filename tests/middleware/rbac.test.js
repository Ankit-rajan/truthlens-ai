const { authorize, requireActiveUser } = require('../../middleware/rbac');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authorize()', () => {
  test('calls next() when the user has an allowed role', () => {
    const req = { user: { role: 'admin' } };
    const res = mockRes();
    const next = jest.fn();

    authorize('admin')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('returns 403 when the user role is not allowed', () => {
    const req = { user: { role: 'user' } };
    const res = mockRes();
    const next = jest.fn();

    authorize('admin')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('returns 401 when there is no authenticated user', () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    authorize('admin')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('requireActiveUser()', () => {
  test('allows an active user through', () => {
    const req = { user: { status: 'active' } };
    const res = mockRes();
    const next = jest.fn();

    requireActiveUser(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('blocks a banned user with 403', () => {
    const req = { user: { status: 'banned' } };
    const res = mockRes();
    const next = jest.fn();

    requireActiveUser(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('blocks a suspended user with 403', () => {
    const req = { user: { status: 'suspended' } };
    const res = mockRes();
    const next = jest.fn();

    requireActiveUser(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
