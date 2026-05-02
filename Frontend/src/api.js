import { clearSession, getAuthToken } from './session';

const rawApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://YOUR-LAPTOP-IP:8080/api';
export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');

export const apiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null;
}

async function parseError(response, fallback) {
  const err = await response.json().catch(() => ({}));
  return err.message || err.error || `${fallback} (${response.status})`;
}

function normalizeSale(sale) {
  if (!sale) return null;
  const saleId = sale._id || sale.id || '';
  return {
    ...sale,
    id: saleId,
    _id: saleId,
  };
}

function normalizeProduct(product) {
  if (!product) return null;
  const productId = product._id || product.id || '';
  return {
    ...product,
    id: productId,
    _id: productId,
  };
}

function withQuery(path, params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.append(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

async function request(path, options = {}, useAuth = true) {
  const headers = { ...(options.headers || {}) };
  if (!options.skipJsonContentType && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (useAuth) {
    const token = await getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(apiUrl(path), { ...options, headers });
  if (response.status === 401) {
    await clearSession();
    unauthorizedHandler?.();
  }
  return response;
}

export async function loginUser(identifier, password) {
  const trimmedIdentifier = String(identifier || '').trim();
  const payload = {
    username: trimmedIdentifier,
    password,
  };
  if (trimmedIdentifier.includes('@')) payload.email = trimmedIdentifier;

  const response = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, false);

  if (!response.ok) throw new Error(await parseError(response, 'Invalid credentials'));
  return response.json();
}

export async function forgotPassword(email) {
  const response = await request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }, false);
  if (!response.ok) throw new Error(await parseError(response, 'Failed to send OTP'));
  return response.json();
}

export async function verifyOtp(email, otp) {
  const response = await request('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  }, false);
  if (!response.ok) throw new Error(await parseError(response, 'Invalid OTP'));
  return response.json();
}

export async function resetPassword(email, newPassword) {
  const response = await request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, newPassword }),
  }, false);
  if (!response.ok) throw new Error(await parseError(response, 'Failed to reset password'));
  return response.json();
}

export async function getCurrentUser() {
  const response = await request('/auth/me');
  if (!response.ok) throw new Error(await parseError(response, 'Failed to fetch profile'));
  return response.json();
}

function appendAvatarToFormData(formData, asset) {
  if (asset?.file) {
    formData.append('avatar', asset.file);
    return;
  }

  formData.append('avatar', {
    uri: asset.uri,
    name: asset.fileName || `profile-photo-${Date.now()}.jpg`,
    type: asset.mimeType || 'image/jpeg',
  });
}

export async function uploadMyProfileAvatar(asset) {
  const formData = new FormData();
  appendAvatarToFormData(formData, asset);

  const response = await request('/auth/me/avatar', {
    method: 'PUT',
    body: formData,
    skipJsonContentType: true,
  });

  if (!response.ok) throw new Error(await parseError(response, 'Failed to upload profile photo'));
  return response.json();
}

export async function changeMyPassword(currentPassword, newPassword, confirmPassword) {
  const response = await request('/auth/me/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update password'));
  return response.json();
}

export async function getUsers() {
  const response = await request('/admin/users');
  if (!response.ok) throw new Error(await parseError(response, 'Failed to fetch users'));
  return response.json();
}

export async function createUser(userData) {
  const response = await request('/admin/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to create user'));
  return response.json();
}

export async function updateUser(id, userData) {
  const response = await request(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update user'));
  return response.json();
}

export async function deleteUser(id) {
  const response = await request(`/admin/users/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to delete user'));
}

export async function unlockUser(id) {
  const response = await request(`/admin/users/${id}/unlock`, { method: 'PUT' });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to unlock user'));
  return response.json();
}

export async function getLoginHistory() {
  const response = await request('/logins');
  if (!response.ok) throw new Error(await parseError(response, 'Failed to fetch login history'));
  return response.json();
}

export async function getSuppliers() {
  const response = await request('/admin/suppliers');
  if (!response.ok) throw new Error(await parseError(response, 'Failed to fetch suppliers'));
  return response.json();
}

export async function createSupplier(supplierData) {
  const response = await request('/admin/suppliers', {
    method: 'POST',
    body: JSON.stringify(supplierData),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to create supplier'));
  return response.json();
}

export async function updateSupplier(id, supplierData) {
  const response = await request(`/admin/suppliers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(supplierData),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update supplier'));
  return response.json();
}

export async function deleteSupplier(id) {
  const response = await request(`/admin/suppliers/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to delete supplier'));
}

export async function getProducts() {
  const response = await request('/products');
  if (!response.ok) throw new Error(await parseError(response, 'Failed to fetch products'));
  const payload = await response.json();
  return (payload.data || []).map(normalizeProduct).filter(Boolean);
}

export async function getSalesDashboardSummary(params = {}) {
  const response = await request(withQuery('/dashboard/summary', params));
  if (!response.ok) throw new Error(await parseError(response, 'Failed to fetch sales dashboard summary'));
  const payload = await response.json();
  return {
    ...(payload.data || {}),
    latestActiveSale: normalizeSale(payload.data?.latestActiveSale),
  };
}

export async function getSales(params = {}) {
  const response = await request(withQuery('/sales', params));
  if (!response.ok) throw new Error(await parseError(response, 'Failed to fetch sales'));
  const payload = await response.json();
  return {
    items: (payload.data || []).map(normalizeSale).filter(Boolean),
    meta: payload.meta || null,
  };
}

export async function getSaleById(id) {
  const response = await request(`/sales/${id}`);
  if (!response.ok) throw new Error(await parseError(response, 'Failed to fetch sale'));
  const payload = await response.json();
  return normalizeSale(payload.data);
}

export async function createSale(payload) {
  const response = await request('/sales', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to record sale'));
  const data = await response.json();
  return normalizeSale(data.data);
}

export async function updateSale(id, payload) {
  const response = await request(`/sales/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update sale'));
  const data = await response.json();
  return normalizeSale(data.data);
}

export async function voidSale(id, voidReason) {
  const response = await request(`/sales/${id}/void`, {
    method: 'POST',
    body: JSON.stringify({ voidReason }),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to void sale'));
  const data = await response.json();
  return normalizeSale(data.data);
}

export async function uploadSaleReceipt(saleId, asset) {
  const formData = new FormData();

  if (asset?.file) {
    formData.append('receipt', asset.file);
  } else {
    formData.append('receipt', {
      uri: asset.uri,
      name: asset.fileName || `receipt-${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    });
  }

  const response = await request(`/sales/${saleId}/receipt`, {
    method: 'POST',
    body: formData,
    skipJsonContentType: true,
  });

  if (!response.ok) throw new Error(await parseError(response, 'Failed to upload sale receipt'));
  const data = await response.json();
  return normalizeSale(data.data);
}
