function normalizeDateOnly(value) {
  const clean = String(value || '').trim();
  if (!clean) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return '';

  const date = new Date(`${clean}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10) === clean ? clean : '';
}

function getCurrentDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function isPastDateOnly(dateOnly, today = getCurrentDateOnly()) {
  const cleanDate = normalizeDateOnly(dateOnly);
  if (!cleanDate) return false;
  return cleanDate < today;
}

function getInventoryStatus(expiryDate, today = getCurrentDateOnly()) {
  const cleanDate = normalizeDateOnly(expiryDate);
  if (!cleanDate) return 'FRESH';

  const target = new Date(`${cleanDate}T00:00:00Z`);
  const current = new Date(`${today}T00:00:00Z`);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.floor((target.getTime() - current.getTime()) / msPerDay);

  if (daysRemaining < 0) return 'EXPIRED';
  if (daysRemaining <= 7) return 'EXPIRING_SOON';
  return 'FRESH';
}

module.exports = {
  normalizeDateOnly,
  getCurrentDateOnly,
  isPastDateOnly,
  getInventoryStatus,
};
