const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isPastDateOnly,
  normalizeDateOnly,
  getInventoryStatus,
} = require('../utils/inventoryStatus');

test('normalizeDateOnly accepts valid YYYY-MM-DD values', () => {
  assert.equal(normalizeDateOnly('2026-05-06'), '2026-05-06');
  assert.equal(normalizeDateOnly('2026/05/06'), '');
  assert.equal(normalizeDateOnly('invalid'), '');
});

test('getInventoryStatus derives fresh, expiring soon, and expired states', () => {
  const today = '2026-05-02';

  assert.equal(getInventoryStatus('2026-05-20', today), 'FRESH');
  assert.equal(getInventoryStatus('2026-05-06', today), 'EXPIRING_SOON');
  assert.equal(getInventoryStatus('2026-05-01', today), 'EXPIRED');
});

test('isPastDateOnly detects expired dates correctly', () => {
  const today = '2026-05-02';

  assert.equal(isPastDateOnly('2026-05-01', today), true);
  assert.equal(isPastDateOnly('2026-05-02', today), false);
  assert.equal(isPastDateOnly('2026-05-20', today), false);
});
