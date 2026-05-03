function sanitizeDiscountPromoImageName(originalName) {
  return String(originalName || 'promo.jpg')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80);
}

module.exports = { sanitizeDiscountPromoImageName };
