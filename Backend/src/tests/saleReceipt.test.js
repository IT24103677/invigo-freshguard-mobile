const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_SALE_RECEIPT_SIZE_BYTES,
  isAllowedSaleReceiptType,
  sanitizeSaleReceiptName,
  buildSaleReceiptPath,
} = require('../utils/saleReceipt');

test('sale receipt helpers keep upload rules strict', () => {
  assert.equal(MAX_SALE_RECEIPT_SIZE_BYTES, 5 * 1024 * 1024);
  assert.equal(isAllowedSaleReceiptType('image/jpeg'), true);
  assert.equal(isAllowedSaleReceiptType('image/png'), true);
  assert.equal(isAllowedSaleReceiptType('image/webp'), true);
  assert.equal(isAllowedSaleReceiptType('image/gif'), false);
});

test('sale receipt filenames are sanitized for GridFS storage', () => {
  assert.equal(sanitizeSaleReceiptName('cash receipt!!.png'), 'cash-receipt-.png');
  assert.equal(sanitizeSaleReceiptName(''), 'sale-receipt');
});

test('sale receipt path includes sale id and cache-busting timestamp', () => {
  const path = buildSaleReceiptPath({
    _id: 'sale-id',
    receiptImageFileId: 'file-id',
    receiptImageUpdatedAt: '2026-05-02T10:00:00.000Z',
  });

  assert.equal(path, '/sales/sale-id/receipt-file?updatedAt=2026-05-02T10%3A00%3A00.000Z');
  assert.equal(buildSaleReceiptPath({ _id: 'sale-id' }), '');
});
