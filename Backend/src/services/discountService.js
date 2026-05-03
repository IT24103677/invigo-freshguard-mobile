const mongoose = require('mongoose');
const Discount = require('../models/Discount');
const Batch = require('../models/Batch');
const Product = require('../models/Product');

function notFound(msg) {
  return Object.assign(new Error(msg), { statusCode: 404 });
}

function badRequest(msg) {
  return Object.assign(new Error(msg), { statusCode: 400 });
}

async function createDiscount(payload, userId) {
  const [product, batch] = await Promise.all([
    Product.findById(payload.productId),
    Batch.findById(payload.batchId),
  ]);

  if (!product) throw notFound('Product not found.');
  if (!batch)   throw notFound('Batch not found.');

  if (String(batch.productId) !== String(payload.productId)) {
    throw badRequest('This batch does not belong to the selected product.');
  }

  const discount = await Discount.create({
    productId:       payload.productId,
    batchId:         payload.batchId,
    productName:     product.name,
    batchNumber:     batch.batchNumber || null,
    discountPercent: payload.discountPercent,
    note:            payload.note || null,
    source:          payload.source || 'MANUAL',
    active:          true,
    createdBy:       userId || null,
  });

  return discount;
}

async function getDiscounts() {
  return Discount.find().sort({ createdAt: -1 });
}

async function getDiscountById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw notFound('Discount not found.');
  const discount = await Discount.findById(id);
  if (!discount) throw notFound('Discount not found.');
  return discount;
}

async function updateDiscount(id, payload) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw notFound('Discount not found.');
  const discount = await Discount.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true }
  );
  if (!discount) throw notFound('Discount not found.');
  return discount;
}

async function toggleDiscount(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw notFound('Discount not found.');
  const discount = await Discount.findById(id);
  if (!discount) throw notFound('Discount not found.');
  discount.active = !discount.active;
  await discount.save();
  return discount;
}

async function deleteDiscount(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw notFound('Discount not found.');
  const discount = await Discount.findByIdAndDelete(id);
  if (!discount) throw notFound('Discount not found.');
  return discount;
}

async function getActiveDiscountForBatch(batchId) {
  if (!mongoose.Types.ObjectId.isValid(batchId)) return null;
  return Discount.findOne({ batchId, active: true });
}

module.exports = {
  createDiscount,
  getDiscounts,
  getDiscountById,
  updateDiscount,
  toggleDiscount,
  deleteDiscount,
  getActiveDiscountForBatch,
};
