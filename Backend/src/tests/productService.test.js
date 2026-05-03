const test = require('node:test');
const assert = require('node:assert/strict');

test('updateProductSchema rejects empty payload', async () => {
  const { updateProductSchema } = require('../validations/productValidation');
  await assert.rejects(
    () => updateProductSchema.validateAsync({}),
    (err) => {
      assert.ok(err.isJoi);
      return true;
    }
  );
});

test('updateProductSchema accepts partial update', async () => {
  const { updateProductSchema } = require('../validations/productValidation');
  const result = await updateProductSchema.validateAsync({ name: 'New Name' });
  assert.equal(result.name, 'New Name');
});

test('createProductSchema requires name, category, unitType, and prices', async () => {
  const { createProductSchema } = require('../validations/productValidation');
  await assert.rejects(
    () => createProductSchema.validateAsync({ name: 'Milk' }, { abortEarly: false }),
    (err) => {
      assert.ok(err.isJoi);
      return true;
    }
  );
});

test('createProductSchema accepts valid product', async () => {
  const { createProductSchema } = require('../validations/productValidation');
  const result = await createProductSchema.validateAsync({
    name: 'Fresh Milk',
    category: 'Dairy',
    unitType: 'litre',
    buyingPrice: 100,
    sellingPrice: 150,
  });
  assert.equal(result.name, 'Fresh Milk');
  assert.equal(result.sellingPrice, 150);
});
