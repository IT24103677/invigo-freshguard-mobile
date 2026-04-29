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

async function request(path, options = {}, useAuth = true) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
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
