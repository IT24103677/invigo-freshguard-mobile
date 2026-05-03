const MAX_BATCH_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_BATCH_DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

function isAllowedBatchDocumentType(contentType) {
  return ALLOWED_BATCH_DOCUMENT_TYPES.includes(String(contentType || '').trim().toLowerCase());
}

function sanitizeBatchDocumentName(originalName) {
  const fallback = 'batch-document';
  const rawName = String(originalName || fallback).trim() || fallback;
  return rawName
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

module.exports = {
  MAX_BATCH_DOCUMENT_SIZE_BYTES,
  ALLOWED_BATCH_DOCUMENT_TYPES,
  isAllowedBatchDocumentType,
  sanitizeBatchDocumentName,
};
