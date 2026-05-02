const rawApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8080/api';
export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');

export const apiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

async function parseError(response, fallback) {
  const err = await response.json().catch(() => ({}));
  return err.message || err.error || `${fallback} (${response.status})`;
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(apiUrl(path), { ...options, headers });
}

export async function getProducts() {
  const response = await request('/products');
  if (!response.ok) throw new Error(await parseError(response, 'Failed to fetch products'));
  return response.json();
}

export async function getInventoryBatches() {
  const response = await request('/inventory-batches');
  if (!response.ok) throw new Error(await parseError(response, 'Failed to fetch inventory batches'));
  return response.json();
}

export async function createInventoryBatch(batchData) {
  const response = await request('/inventory-batches', {
    method: 'POST',
    body: JSON.stringify(batchData),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to create inventory batch'));
  return response.json();
}

export async function updateInventoryBatch(id, batchData) {
  const response = await request(`/inventory-batches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(batchData),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update inventory batch'));
  return response.json();
}

export async function deleteInventoryBatch(id) {
  const response = await request(`/inventory-batches/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to delete inventory batch'));
}
