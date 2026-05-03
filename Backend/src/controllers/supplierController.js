const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const asyncHandler = require('../utils/asyncHandler');
const {
  storeSupplierLogo,
  findSupplierLogo,
  deleteSupplierLogo,
  openSupplierLogoDownloadStream,
} = require('../config/gridfs');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+\d\s().-]{7,20}$/;
const CATEGORY_OPTIONS = ['Produce', 'Dairy', 'Bakery', 'Meat', 'Beverages', 'Dry Goods', 'Frozen', 'Other'];
const STATUS_OPTIONS = ['Active', 'Inactive'];

function getTodayDateOnly() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isFutureDateOnly(value) {
  const clean = String(value || '').trim();
  if (!clean) return false;
  return clean > getTodayDateOnly();
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSupplierStatus(status) {
  return String(status || '').trim().toLowerCase() === 'active' ? 'Active' : 'Inactive';
}

function cleanSupplierPayload(body) {
  const payload = { ...body };

  if (!payload.supplierName && payload.name) payload.supplierName = payload.name;
  if (!payload.name && payload.supplierName) payload.name = payload.supplierName;

  payload.supplierName = String(payload.supplierName || '').trim();
  payload.name = String(payload.name || payload.supplierName || '').trim();
  payload.contactPerson = String(payload.contactPerson || '').trim();
  payload.email = String(payload.email || '').trim().toLowerCase();
  payload.phone = String(payload.phone || '').trim();
  payload.category = String(payload.category || 'Produce').trim();
  payload.status = normalizeSupplierStatus(payload.status || 'Active');
  payload.lastOrderDate = String(payload.lastOrderDate || '').trim();
  payload.address = String(payload.address || '').trim();
  payload.notes = String(payload.notes || '').trim();

  if (payload.deliveryDays === '' || payload.deliveryDays === undefined) payload.deliveryDays = null;
  if (payload.rating === '' || payload.rating === undefined) payload.rating = null;
  if (payload.productsSupplied === '' || payload.productsSupplied === undefined) payload.productsSupplied = 0;

  if (payload.deliveryDays !== null) payload.deliveryDays = Number(payload.deliveryDays);
  if (payload.rating !== null) payload.rating = Number(payload.rating);
  if (payload.productsSupplied !== 0 || body.productsSupplied === 0 || body.productsSupplied === '0') {
    payload.productsSupplied = Number(payload.productsSupplied);
  }

  return payload;
}

function serialiseSupplier(supplier) {
  const value = supplier?.toJSON ? supplier.toJSON() : supplier;
  return {
    ...value,
    status: normalizeSupplierStatus(value?.status),
  };
}

function isValidDateOnly(value) {
  const clean = String(value || '').trim();
  if (!clean) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return false;
  const date = new Date(`${clean}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === clean;
}

function validateSupplierPayload(payload) {
  if (!payload.supplierName) return 'Supplier name is required.';
  if (payload.supplierName.length < 2) return 'Supplier name must be at least 2 characters.';
  if (!payload.contactPerson) return 'Contact person is required.';
  if (payload.contactPerson.length < 2) return 'Contact person must be at least 2 characters.';
  if (payload.email && !EMAIL_REGEX.test(payload.email)) return 'Please enter a valid supplier email.';
  if (payload.phone && !PHONE_REGEX.test(payload.phone)) return 'Please enter a valid supplier phone number.';
  if (!CATEGORY_OPTIONS.includes(payload.category)) return 'Please choose a valid supplier category.';
  if (!STATUS_OPTIONS.includes(payload.status)) return 'Please choose a valid supplier status.';

  if (payload.deliveryDays !== null) {
    if (!Number.isInteger(payload.deliveryDays) || payload.deliveryDays < 0) {
      return 'Delivery days must be a whole number greater than or equal to 0.';
    }
  }

  if (payload.productsSupplied !== null && payload.productsSupplied !== undefined) {
    if (!Number.isInteger(payload.productsSupplied) || payload.productsSupplied < 0) {
      return 'Products supplied must be a whole number greater than or equal to 0.';
    }
  }

  if (payload.rating !== null) {
    if (Number.isNaN(payload.rating) || payload.rating < 0 || payload.rating > 5) {
      return 'Rating must be between 0 and 5.';
    }
  }

  if (!isValidDateOnly(payload.lastOrderDate)) {
    return 'Last order date must be a valid date in YYYY-MM-DD format.';
  }

  if (isFutureDateOnly(payload.lastOrderDate)) {
    return 'Last order date cannot be in the future.';
  }

  return null;
}

async function findDuplicateSupplier(payload, excludeId) {
  const checks = [];

  if (payload.supplierName) {
    checks.push({
      supplierName: new RegExp(`^${escapeRegex(payload.supplierName)}$`, 'i'),
    });
  }

  if (payload.email) {
    checks.push({ email: payload.email });
  }

  if (!checks.length) return null;

  const filter = { $or: checks };
  if (excludeId) filter._id = { $ne: excludeId };

  return Supplier.findOne(filter);
}

const getSuppliers = asyncHandler(async (req, res) => {
  const { status, category, q } = req.query;
  const filter = {};

  if (status && status !== 'all') {
    const normalizedStatus = normalizeSupplierStatus(status);
    filter.status = normalizedStatus === 'Inactive'
      ? { $in: ['Inactive', 'Pending'] }
      : 'Active';
  }
  if (category && category !== 'all') filter.category = category;
  if (q) {
    const regex = new RegExp(escapeRegex(String(q)), 'i');
    filter.$or = [
      { supplierName: regex },
      { contactPerson: regex },
      { email: regex },
      { phone: regex },
      { category: regex },
    ];
  }

  const suppliers = await Supplier.find(filter).sort({ createdAt: -1 });
  res.json(suppliers.map(serialiseSupplier));
});

const createSupplier = asyncHandler(async (req, res) => {
  const payload = cleanSupplierPayload(req.body);

  const validationError = validateSupplierPayload(payload);
  if (validationError) return res.status(400).json({ message: validationError });

  const existingSupplier = await findDuplicateSupplier(payload);
  if (existingSupplier) {
    return res.status(409).json({ message: 'A supplier with that name or email already exists.' });
  }

  const supplier = await Supplier.create({
    ...payload,
    createdBy: req.user._id,
  });

  res.status(201).json(serialiseSupplier(supplier));
});

const getSupplierById = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) return res.status(404).json({ message: 'Supplier not found.' });
  res.json(serialiseSupplier(supplier));
});

const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) return res.status(404).json({ message: 'Supplier not found.' });

  const payload = cleanSupplierPayload(req.body);
  const validationError = validateSupplierPayload({ ...supplier.toJSON(), ...payload });
  if (validationError) return res.status(400).json({ message: validationError });

  const existingSupplier = await findDuplicateSupplier(payload, supplier._id);
  if (existingSupplier) {
    return res.status(409).json({ message: 'A supplier with that name or email already exists.' });
  }

  Object.assign(supplier, payload);
  await supplier.save();
  res.json(serialiseSupplier(supplier));
});

const deleteSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByIdAndDelete(req.params.id);

  if (!supplier) return res.status(404).json({ message: 'Supplier not found.' });
  res.json({ message: 'Supplier deleted successfully.' });
});

const uploadSupplierLogoHandler = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid supplier id.' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'No logo file provided.' });
  }

  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) return res.status(404).json({ message: 'Supplier not found.' });

  if (supplier.logoFileId) {
    await deleteSupplierLogo(supplier.logoFileId).catch(() => null);
  }

  const stored = await storeSupplierLogo({
    supplierId: supplier._id,
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
    originalName: req.file.originalname,
  });

  supplier.logoFileId = stored._id;
  supplier.logoUpdatedAt = new Date();
  await supplier.save();

  res.json(serialiseSupplier(supplier));
});

const getSupplierLogoHandler = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid supplier id.' });
  }

  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) return res.status(404).json({ message: 'Supplier not found.' });

  if (!supplier.logoFileId) {
    return res.status(404).json({ message: 'No logo for this supplier.' });
  }

  const file = await findSupplierLogo(supplier.logoFileId);
  if (!file) return res.status(404).json({ message: 'Logo file not found.' });

  res.set('Content-Type', file.contentType || 'image/jpeg');
  res.set('Cache-Control', 'public, max-age=31536000');

  const stream = openSupplierLogoDownloadStream(supplier.logoFileId);
  stream.on('error', () => {
    if (!res.headersSent) res.status(500).json({ message: 'Failed to stream logo.' });
  });
  stream.pipe(res);
});

module.exports = {
  getSuppliers,
  createSupplier,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  uploadSupplierLogoHandler,
  getSupplierLogoHandler,
};
