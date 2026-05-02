const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeRole,
  getPublicRouteName,
  getTabRouteKeys,
  canAccessTab,
  shouldVerifyStoredSession,
} = require('../src/navigation/helpers.cjs');

test('normalizeRole falls back to STAFF for non-admin roles', () => {
  assert.equal(normalizeRole('admin'), 'ADMIN');
  assert.equal(normalizeRole('staff'), 'STAFF');
  assert.equal(normalizeRole('other'), 'STAFF');
});

test('public route mapping resolves auth screens', () => {
  assert.equal(getPublicRouteName('landing'), 'Landing');
  assert.equal(getPublicRouteName('login'), 'Login');
  assert.equal(getPublicRouteName('forgot'), 'ForgotPassword');
  assert.equal(getPublicRouteName('unknown'), 'Landing');
});

test('tab access stays role-aware', () => {
  assert.deepEqual(getTabRouteKeys('ADMIN'), ['dashboard', 'adminUsers', 'suppliers', 'salesPos', 'salesHistory', 'salesReports']);
  assert.deepEqual(getTabRouteKeys('STAFF'), ['dashboard', 'profile', 'salesPos', 'salesHistory', 'salesReports']);
  assert.equal(canAccessTab('ADMIN', 'suppliers'), true);
  assert.equal(canAccessTab('STAFF', 'suppliers'), false);
  assert.equal(canAccessTab('ADMIN', 'salesReports'), true);
  assert.equal(canAccessTab('STAFF', 'salesPos'), true);
});

test('stored sessions require both token and user context before verification', () => {
  assert.equal(shouldVerifyStoredSession('', null), false);
  assert.equal(shouldVerifyStoredSession('token', null), false);
  assert.equal(shouldVerifyStoredSession('token', { id: 'user-1' }), true);
});
