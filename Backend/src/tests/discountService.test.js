const test = require('node:test');
const assert = require('node:assert/strict');

const { createDiscountSchema, updateDiscountSchema } = require('../validations/discountValidation');

const validPayload = {
  productId: '6642a1b2c3d4e5f6a7b8c9d0',
  batchId: '6642a1b2c3d4e5f6a7b8c9d1',
  discountPercent: 20,
};

test('createDiscountSchema accepts a valid create payload', async () => {
  const result = await createDiscountSchema.validateAsync(validPayload);
  assert.equal(result.discountPercent, 20);
  assert.equal(result.source, 'MANUAL');
});

test('createDiscountSchema accepts source AI', async () => {
  const result = await createDiscountSchema.validateAsync({ ...validPayload, source: 'AI' });
  assert.equal(result.source, 'AI');
});

test('createDiscountSchema rejects missing productId', async () => {
  const { productId, ...rest } = validPayload;
  await assert.rejects(() => createDiscountSchema.validateAsync(rest));
});

test('createDiscountSchema rejects missing batchId', async () => {
  const { batchId, ...rest } = validPayload;
  await assert.rejects(() => createDiscountSchema.validateAsync(rest));
});

test('createDiscountSchema rejects discountPercent below 1', async () => {
  await assert.rejects(() =>
    createDiscountSchema.validateAsync({ ...validPayload, discountPercent: 0 })
  );
});

test('createDiscountSchema rejects discountPercent above 90', async () => {
  await assert.rejects(() =>
    createDiscountSchema.validateAsync({ ...validPayload, discountPercent: 91 })
  );
});

test('createDiscountSchema rejects decimal discountPercent', async () => {
  await assert.rejects(() =>
    createDiscountSchema.validateAsync({ ...validPayload, discountPercent: 10.5 })
  );
});

test('createDiscountSchema rejects invalid source', async () => {
  await assert.rejects(() =>
    createDiscountSchema.validateAsync({ ...validPayload, source: 'ROBOT' })
  );
});

test('createDiscountSchema accepts optional note', async () => {
  const result = await createDiscountSchema.validateAsync({ ...validPayload, note: 'Clearance sale' });
  assert.equal(result.note, 'Clearance sale');
});

test('createDiscountSchema accepts null note', async () => {
  const result = await createDiscountSchema.validateAsync({ ...validPayload, note: null });
  assert.equal(result.note, null);
});

test('updateDiscountSchema accepts partial update with discountPercent', async () => {
  const result = await updateDiscountSchema.validateAsync({ discountPercent: 35 });
  assert.equal(result.discountPercent, 35);
});

test('updateDiscountSchema accepts active toggle', async () => {
  const result = await updateDiscountSchema.validateAsync({ active: false });
  assert.equal(result.active, false);
});

test('updateDiscountSchema accepts note update', async () => {
  const result = await updateDiscountSchema.validateAsync({ note: 'Updated note' });
  assert.equal(result.note, 'Updated note');
});

test('updateDiscountSchema rejects empty object', async () => {
  await assert.rejects(() => updateDiscountSchema.validateAsync({}));
});

test('updateDiscountSchema rejects discountPercent above 90', async () => {
  await assert.rejects(() => updateDiscountSchema.validateAsync({ discountPercent: 95 }));
});

function daysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  return Math.ceil((new Date(expiryDate) - Date.now()) / 86400000);
}

function computeRiskLevel(batch) {
  const days = daysUntilExpiry(batch.expiryDate);
  const qty = batch.quantityOnHand ?? 0;
  if (days !== null && days < 0) return 'EXPIRED';
  if (days !== null && days <= 7) return 'HIGH';
  if (qty === 0) return 'HIGH';
  if (days !== null && days <= 30) return 'MEDIUM';
  if (qty <= 10) return 'MEDIUM';
  return 'LOW';
}

function futureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function pastDate(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

test('computeRiskLevel returns EXPIRED for past expiry', () => {
  assert.equal(computeRiskLevel({ expiryDate: pastDate(1), quantityOnHand: 50 }), 'EXPIRED');
});

test('computeRiskLevel returns HIGH for expiry within 7 days', () => {
  assert.equal(computeRiskLevel({ expiryDate: futureDate(5), quantityOnHand: 50 }), 'HIGH');
});

test('computeRiskLevel returns HIGH for zero quantity', () => {
  assert.equal(computeRiskLevel({ expiryDate: futureDate(60), quantityOnHand: 0 }), 'HIGH');
});

test('computeRiskLevel returns MEDIUM for expiry within 30 days', () => {
  assert.equal(computeRiskLevel({ expiryDate: futureDate(20), quantityOnHand: 50 }), 'MEDIUM');
});

test('computeRiskLevel returns MEDIUM for low quantity', () => {
  assert.equal(computeRiskLevel({ expiryDate: futureDate(60), quantityOnHand: 8 }), 'MEDIUM');
});

test('computeRiskLevel returns LOW for healthy batch', () => {
  assert.equal(computeRiskLevel({ expiryDate: futureDate(60), quantityOnHand: 100 }), 'LOW');
});
