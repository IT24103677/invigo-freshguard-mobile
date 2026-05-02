const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getNavItems,
  isWorkingModule,
  getHeaderTitle,
} = require('../src/navigation/helpers.cjs');

test('navigation exposes the full dashboard shell order', () => {
  const items = getNavItems();
  assert.equal(items.length, 9);
  assert.equal(items[0].label, 'Home Page');
  assert.equal(items[3].key, 'inventory');
});

test('only inventory is marked as the working module', () => {
  assert.equal(isWorkingModule('inventory'), true);
  assert.equal(isWorkingModule('products'), false);
});

test('inventory header title uses the screenshot wording', () => {
  assert.equal(getHeaderTitle('inventory'), 'Rapid Scan');
  assert.equal(getHeaderTitle('home'), 'Home Page');
});
