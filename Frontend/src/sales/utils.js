export const SALES_STOCK_FILTERS = ['ALL_STOCK', 'IN_STOCK', 'LOW_STOCK', 'UNAVAILABLE'];
export const SALES_HISTORY_FILTERS = ['ALL', 'ACTIVE', 'VOID'];
export const SALES_RANGE_FILTERS = ['TODAY', 'THIS_WEEK', 'THIS_MONTH'];

export function formatMoney(amount) {
  return `Rs. ${Number(amount || 0).toFixed(2)}`;
}

export function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(value) {
  if (!value) return 'Just now';
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor(diff / 60000);

  if (hours >= 24) return `${Math.floor(hours / 24)}d ago`;
  if (hours >= 1) return `${hours}h ago`;
  if (minutes >= 1) return `${minutes}m ago`;
  return 'Just now';
}

export function formatNearestExpiry(value) {
  if (!value) return 'No active expiry';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No active expiry';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function normalizeCategoryKey(category) {
  return String(category || '').trim().toUpperCase();
}

export function formatCategoryLabel(category) {
  return String(category || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function matchesProductSearch(product, rawSearch) {
  const query = String(rawSearch || '').trim().toLowerCase();
  if (!query) return true;

  const fields = [
    product?.name,
    product?.category,
    product?.sku,
    product?.barcode,
    product?.brand,
    product?.supplier,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return fields.some((field) => field.includes(query));
}

export function getStockStatus(product) {
  const sellableUnits = Number(product?.sellableUnits || 0);

  if (sellableUnits <= 0) return 'critical';
  if (sellableUnits <= 5) return 'low-stock';
  return 'in-stock';
}

export function getExpiryStatus(product) {
  if (!product?.nearestExpiryDate || Number(product?.activeBatchCount || 0) <= 0) {
    return { variant: 'stable', label: 'No Active Batch' };
  }

  const expiryDate = new Date(product.nearestExpiryDate);
  const diffDays = Math.floor((expiryDate.getTime() - Date.now()) / 86400000);

  if (diffDays < 0) return { variant: 'expired', label: 'Expired' };
  if (diffDays === 0) return { variant: 'expires-soon', label: 'Expires Today' };
  if (diffDays <= 3) return { variant: 'expires-soon', label: `Expires in ${diffDays}d` };

  return { variant: 'stable', label: `Stable ${formatNearestExpiry(product.nearestExpiryDate)}` };
}

export function buildProductsMap(products) {
  return (products || []).reduce((map, product) => {
    const key = product?._id || product?.id;
    if (key) map[key] = product;
    return map;
  }, {});
}

export function getCartStockIssues(cart, productsMap) {
  return (cart || []).reduce((issues, item) => {
    const latestProduct = productsMap?.[item.productId];

    if (!latestProduct || !latestProduct.isActive) {
      issues.push({
        productId: item.productId,
        productName: item.productName,
        allowedQuantity: 0,
        currentQuantity: item.quantity,
        reason: 'This product is no longer available for sale.',
      });
      return issues;
    }

    const allowedQuantity = Math.max(0, Number(latestProduct.sellableUnits || 0));
    if (allowedQuantity <= 0) {
      issues.push({
        productId: item.productId,
        productName: item.productName,
        allowedQuantity,
        currentQuantity: item.quantity,
        reason: 'This product is now out of stock.',
      });
      return issues;
    }

    if (item.quantity > allowedQuantity) {
      issues.push({
        productId: item.productId,
        productName: item.productName,
        allowedQuantity,
        currentQuantity: item.quantity,
        reason: `Only ${allowedQuantity} ${allowedQuantity === 1 ? 'unit is' : 'units are'} currently sellable.`,
      });
    }

    return issues;
  }, []);
}

export function generateClientRequestKey() {
  return `sale-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeCustomerName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export function getDashboardRangeLabel(range) {
  if (range === 'THIS_WEEK') return 'This Week';
  if (range === 'THIS_MONTH') return 'This Month';
  return 'Today';
}

export function getDashboardRangeParams(range) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (range === 'THIS_WEEK') {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
  }

  if (range === 'THIS_MONTH') {
    start.setDate(1);
  }

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

export function getRangeEmptyMessage(range) {
  if (range === 'THIS_WEEK') {
    return 'No active sales have been recorded yet this week.';
  }

  if (range === 'THIS_MONTH') {
    return 'No active sales have been recorded yet this month.';
  }

  return 'No active sales have been recorded yet today.';
}

export function parseStatusFilter(value) {
  return SALES_HISTORY_FILTERS.includes(value) ? value : 'ALL';
}

export function parseRangeFilter(value, fallback = 'ALL_TIME') {
  const allowed = ['ALL_TIME', ...SALES_RANGE_FILTERS];
  return allowed.includes(value) ? value : fallback;
}

export function getHistoryRangeParams(range) {
  if (range === 'ALL_TIME') return {};
  return getDashboardRangeParams(range);
}

export function buildReceiptShareText(sale) {
  const itemLines = (sale?.items || [])
    .map((item) => `- ${item.productNameSnapshot} x${item.quantity} = ${formatMoney(item.lineTotal)}`)
    .join('\n');

  return [
    'Invigo FreshGuard Receipt',
    `Bill: ${sale?.saleGroupId || '--'}`,
    `Date: ${formatDateTime(sale?.saleDateTime)}`,
    `Status: ${sale?.status || '--'}`,
    '',
    'Items:',
    itemLines,
    '',
    `Subtotal: ${formatMoney(sale?.subTotal)}`,
    `Discount: ${formatMoney(sale?.discountTotal)}`,
    `Grand Total: ${formatMoney(sale?.grandTotal)}`,
    sale?.amountGiven != null
      ? `Paid: ${formatMoney(sale.amountGiven)} | Change: ${formatMoney(sale.changeGiven || 0)}`
      : null,
    sale?.customerName ? `Customer: ${sale.customerName}` : null,
    sale?.customerEmail ? `Email: ${sale.customerEmail}` : null,
    sale?.notes ? `Notes: ${sale.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}
