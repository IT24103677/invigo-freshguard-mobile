const test = require('node:test');
const assert = require('node:assert/strict');

test('createBatchSchema requires productId, receivedDate, expiryDate, quantityOnHand', async () => {
  const { createBatchSchema } = require('../validations/batchValidation');
  await assert.rejects(
    () => createBatchSchema.validateAsync({}, { abortEarly: false }),
    (err) => {
      assert.ok(err.isJoi);
      return true;
    }
  );
});

test('createBatchSchema accepts valid batch payload', async () => {
  const { createBatchSchema } = require('../validations/batchValidation');
  const result = await createBatchSchema.validateAsync({
    productId: 'a'.repeat(24),
    receivedDate: '2026-04-01',
    expiryDate: '2026-06-01',
    quantityOnHand: 50,
  });
  assert.equal(result.quantityOnHand, 50);
});

test('updateBatchSchema rejects empty payload', async () => {
  const { updateBatchSchema } = require('../validations/batchValidation');
  await assert.rejects(
    () => updateBatchSchema.validateAsync({}),
    (err) => {
      assert.ok(err.isJoi);
      return true;
    }
  );
});

test('updateBatchSchema accepts partial update with notes and supplierName', async () => {
  const { updateBatchSchema } = require('../validations/batchValidation');
  const result = await updateBatchSchema.validateAsync({
    notes: 'Checked on arrival',
    supplierName: 'Fresh Valley',
    costPerUnit: 12.5,
  });
  assert.equal(result.notes, 'Checked on arrival');
  assert.equal(result.costPerUnit, 12.5);
});
