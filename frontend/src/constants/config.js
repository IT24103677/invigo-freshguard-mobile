// API Configuration
// Change this to your deployed backend URL for production
export const API_BASE_URL = 'http://172.20.10.2:5000/api'; // WiFi IP address (for physical device)
// export const API_BASE_URL = 'http://10.0.2.2:5000/api'; // Android emulator
// export const API_BASE_URL = 'http://localhost:5000/api'; // iOS simulator
// export const API_BASE_URL = 'https://your-backend.onrender.com/api'; // Production

// App Theme Colors
export const COLORS = {
  primary: '#007A5E',
  primaryDark: '#005A44',
  primaryLight: '#00A37D',
  secondary: '#0F172A',
  secondaryLight: '#1E293B',
  accent: '#F59E0B',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  error: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#3B82F6',
  text: '#0F172A',
  textSecondary: '#64748B',
  textLight: '#94A3B8',
  border: '#E2E8F0',
  disabled: '#CBD5E1',
  white: '#FFFFFF',
  black: '#000000',
  expired: '#EF4444',
  expiringSoon: '#F59E0B',
  safe: '#22C55E',
};

// App constants
export const ROLES = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
};

export const STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
};

export const EXPIRY_STATUS = {
  EXPIRED: 'Expired',
  EXPIRING_SOON: 'Expiring Soon',
  SAFE: 'Safe',
};

export const REPORT_TYPES = [
  { label: 'Expired Items Report', value: 'EXPIRED' },
  { label: 'Near-Expiry Report', value: 'NEAR_EXPIRY' },
  { label: 'Sales Report', value: 'SALES' },
  { label: 'Inventory Summary Report', value: 'INVENTORY_SUMMARY' },
];

export const CATEGORIES = [
  'Fruits',
  'Vegetables',
  'Dairy',
  'Beverages',
  'Snacks',
  'Bakery',
  'Frozen',
  'Meat',
  'Seafood',
  'Condiments',
  'Grains',
  'Other',
];
