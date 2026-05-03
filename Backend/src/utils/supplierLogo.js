const MAX_SUPPLIER_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_SUPPLIER_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function isAllowedSupplierLogoType(contentType) {
  return ALLOWED_SUPPLIER_LOGO_TYPES.includes(String(contentType || '').trim().toLowerCase());
}

function sanitizeSupplierLogoName(originalName) {
  const fallback = 'supplier-logo';
  const rawName = String(originalName || fallback).trim() || fallback;
  return rawName
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

module.exports = {
  MAX_SUPPLIER_LOGO_SIZE_BYTES,
  ALLOWED_SUPPLIER_LOGO_TYPES,
  isAllowedSupplierLogoType,
  sanitizeSupplierLogoName,
};
