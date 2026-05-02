const MAX_SALE_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_SALE_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function isAllowedSaleReceiptType(contentType) {
  return ALLOWED_SALE_RECEIPT_TYPES.includes(String(contentType || '').trim().toLowerCase());
}

function sanitizeSaleReceiptName(originalName) {
  const fallback = 'sale-receipt';
  const rawName = String(originalName || fallback).trim() || fallback;
  return rawName
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function buildSaleReceiptPath(sale) {
  const saleId = sale?.id || sale?._id?.toString?.() || sale?._id;
  if (!saleId || !sale?.receiptImageFileId) return '';

  const updatedAt = sale.receiptImageUpdatedAt
    ? new Date(sale.receiptImageUpdatedAt).toISOString()
    : '';

  return updatedAt
    ? `/sales/${saleId}/receipt-file?updatedAt=${encodeURIComponent(updatedAt)}`
    : `/sales/${saleId}/receipt-file`;
}

module.exports = {
  MAX_SALE_RECEIPT_SIZE_BYTES,
  ALLOWED_SALE_RECEIPT_TYPES,
  isAllowedSaleReceiptType,
  sanitizeSaleReceiptName,
  buildSaleReceiptPath,
};
