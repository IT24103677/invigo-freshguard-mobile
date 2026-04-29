const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const signToken = require('../utils/token');

test('signToken includes the user id and role claims', () => {
  process.env.JWT_SECRET = 'invigo-test-secret';

  const token = signToken({
    _id: { toString: () => 'user-123' },
    role: 'ADMIN',
  });

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  assert.equal(decoded.id, 'user-123');
  assert.equal(decoded.role, 'ADMIN');
});
