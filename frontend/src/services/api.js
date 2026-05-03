import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/config';

// Create Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach JWT token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 (token expired)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid - clear storage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      // The AuthContext will handle the redirect
    }
    return Promise.reject(error);
  }
);

export default api;

// ========== AUTH API ==========
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
};

// ========== USERS API ==========
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  toggleStatus: (id) => api.put(`/users/${id}/toggle-status`),
};

// ========== PRODUCTS API ==========
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      if (key === 'image' && data[key]) {
        formData.append('image', {
          uri: data[key].uri,
          type: data[key].type || 'image/jpeg',
          name: data[key].fileName || 'product.jpg',
        });
      } else {
        formData.append(key, data[key]);
      }
    });
    return api.post('/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (id, data) => {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      if (key === 'image' && data[key] && data[key].uri) {
        formData.append('image', {
          uri: data[key].uri,
          type: data[key].type || 'image/jpeg',
          name: data[key].fileName || 'product.jpg',
        });
      } else {
        formData.append(key, data[key]);
      }
    });
    return api.put(`/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: (id) => api.delete(`/products/${id}`),
};

// ========== INVENTORY API ==========
export const inventoryAPI = {
  getAll: (params) => api.get('/inventory', { params }),
  getAvailableBatches: (productId) => api.get(`/inventory/available/${productId}`),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  delete: (id) => api.delete(`/inventory/${id}`),
};

// ========== SALES API ==========
export const salesAPI = {
  getAll: (params) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post('/sales', data),
  update: (id, data) => api.put(`/sales/${id}`, data),
  delete: (id) => api.delete(`/sales/${id}`),
};

// ========== DISCOUNTS API ==========
export const discountsAPI = {
  getAll: () => api.get('/discounts'),
  getActive: () => api.get('/discounts/active'),
  lookup: (productId, batchId) => api.get('/discounts/lookup', { params: { product: productId, batch: batchId } }),
  create: (data) => api.post('/discounts', data),
  update: (id, data) => api.put(`/discounts/${id}`, data),
  toggle: (id) => api.put(`/discounts/${id}/toggle`),
  delete: (id) => api.delete(`/discounts/${id}`),
};

// ========== ALERTS API ==========
export const alertsAPI = {
  getAll: (params) => api.get('/dashboard/alerts', { params }),
  markAsRead: (id) => api.put(`/dashboard/alerts/${id}/read`),
  clearAll: () => api.delete('/dashboard/alerts/clear'),
  generate: () => api.post('/alerts/generate'), // Keep if needed for background generation
};

// ========== DASHBOARD API ==========
export const dashboardAPI = {
  getSummary: () => api.get('/dashboard/summary'),
  getAlerts: () => api.get('/dashboard/alerts'),
  getSalesChart: () => api.get('/dashboard/charts/sales'),
  getStockChart: () => api.get('/dashboard/charts/stock'),
};

// ========== REPORTS API ==========
export const reportsAPI = {
  getAll: (params) => api.get('/reports', { params }),
  generate: (data) => api.post('/reports/generate', data),
  getById: (id) => api.get(`/reports/${id}`),
  update: (id, data) => api.put(`/reports/${id}`, data),
  delete: (id) => api.delete(`/reports/${id}`),
  getDownloadUrl: (id) => `${API_BASE_URL}/reports/${id}/download`,
};
