const MAX_PRODUCT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function isAllowedProductImageType(contentType) {
  return ALLOWED_PRODUCT_IMAGE_TYPES.includes(String(contentType || '').trim().toLowerCase());
}

function sanitizeProductImageName(originalName) {
  const fallback = 'product-image';
  const rawName = String(originalName || fallback).trim() || fallback;
  return rawName
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

module.exports = {
  MAX_PRODUCT_IMAGE_SIZE_BYTES,
  ALLOWED_PRODUCT_IMAGE_TYPES,
  isAllowedProductImageType,
  sanitizeProductImageName,
};
