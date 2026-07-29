/**
 * Unit tests for the JWT auth middleware (middleware/auth.js).
 *
 * Tests: valid token, missing token, expired token, malformed token.
 */

const jwt = require('jsonwebtoken');

// Set JWT_SECRET before requiring the middleware
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-testing-only';

const requireAuth = require('../../middleware/auth');

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockImplementation((data) => {
    res.body = data;
    return res;
  });
  return res;
}

function next() {
  return jest.fn();
}

describe('requireAuth middleware', () => {
  const secret = process.env.JWT_SECRET;

  test('calls next() for a valid JWT', () => {
    const token = jwt.sign({ id: 'abc123', email: 'test@test.com' }, secret);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const nextFn = next();

    requireAuth(req, res, nextFn);

    expect(nextFn).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe('abc123');
    expect(req.user.email).toBe('test@test.com');
    expect(res.status).not.toHaveBeenCalled();
  });

  test('returns 401 when Authorization header is missing', () => {
    const req = { headers: {} };
    const res = mockRes();
    const nextFn = next();

    requireAuth(req, res, nextFn);

    expect(nextFn).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Authentication required',
    });
  });

  test('returns 401 when Authorization header does not start with "Bearer "', () => {
    const req = { headers: { authorization: 'Token abc123' } };
    const res = mockRes();
    const nextFn = next();

    requireAuth(req, res, nextFn);

    expect(nextFn).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Authentication required',
    });
  });

  test('returns 401 for an expired token', () => {
    const token = jwt.sign({ id: 'abc123' }, secret, { expiresIn: '-1s' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const nextFn = next();

    requireAuth(req, res, nextFn);

    expect(nextFn).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid or expired token',
    });
  });

  test('returns 401 for a token signed with the wrong secret', () => {
    const token = jwt.sign({ id: 'abc123' }, 'wrong-secret');
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const nextFn = next();

    requireAuth(req, res, nextFn);

    expect(nextFn).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid or expired token',
    });
  });

  test('returns 401 for a malformed token string', () => {
    const req = { headers: { authorization: 'Bearer not-a-real-token' } };
    const res = mockRes();
    const nextFn = next();

    requireAuth(req, res, nextFn);

    expect(nextFn).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid or expired token',
    });
  });
});
