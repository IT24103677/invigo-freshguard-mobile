import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Change this to your backend URL ─────────────────────────────────────────
export const API_BASE = "http://192.168.1.100:5000/api"; // ← update your IP/port

// ─── authFetch: attaches JWT from AsyncStorage ────────────────────────────────
export const authFetch = async (url, options = {}) => {
  const token = await AsyncStorage.getItem("authToken");
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
};

// ─── Discount API ─────────────────────────────────────────────────────────────
export const discountApi = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return authFetch(`${API_BASE}/discounts${qs ? "?" + qs : ""}`);
  },
  getStats: () => authFetch(`${API_BASE}/discounts/stats`),
  create: (body) =>
    authFetch(`${API_BASE}/discounts`, { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    authFetch(`${API_BASE}/discounts/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  toggleActive: (id, value) =>
    authFetch(`${API_BASE}/discounts/${id}/active${value !== undefined ? `?value=${value}` : ""}`, {
      method: "PATCH",
    }),
  delete: (id) => authFetch(`${API_BASE}/discounts/${id}`, { method: "DELETE" }),
};

// ─── Alert API ────────────────────────────────────────────────────────────────
export const alertApi = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return authFetch(`${API_BASE}/alerts${qs ? "?" + qs : ""}`);
  },
  getSummary: () => authFetch(`${API_BASE}/alerts/summary`),
};

// ─── Products / Inventory ─────────────────────────────────────────────────────
export const productApi = {
  getAll: () => authFetch(`${API_BASE}/products`),
  getBatchesByProduct: (productId) =>
    authFetch(`${API_BASE}/inventory/by-product/${productId}`),
};

export const inventoryApi = {
  getAll: () => authFetch(`${API_BASE}/inventory`),
};
