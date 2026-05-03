const MAX_DISCOUNT_PROMO_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_DISCOUNT_PROMO_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function isAllowedDiscountPromoImageType(contentType) {
  return ALLOWED_DISCOUNT_PROMO_IMAGE_TYPES.includes(
    String(contentType || '').trim().toLowerCase()
  );
}

function sanitizeDiscountPromoImageName(originalName) {
  return String(originalName || 'promo.jpg')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80);
}

module.exports = {
  MAX_DISCOUNT_PROMO_IMAGE_SIZE_BYTES,
  ALLOWED_DISCOUNT_PROMO_IMAGE_TYPES,
  isAllowedDiscountPromoImageType,
  sanitizeDiscountPromoImageName,
};
