const PUBLIC_ROUTE_NAMES = {
  landing: 'Landing',
  login: 'Login',
  forgot: 'ForgotPassword',
};

function normalizeRole(role) {
  return String(role || '').trim().toUpperCase() === 'ADMIN' ? 'ADMIN' : 'STAFF';
}

function getPublicRouteName(routeKey) {
  return PUBLIC_ROUTE_NAMES[routeKey] || PUBLIC_ROUTE_NAMES.landing;
}

function getTabRouteKeys(role) {
  return normalizeRole(role) === 'ADMIN'
    ? ['dashboard', 'adminUsers', 'suppliers', 'products', 'batches', 'salesPos', 'salesHistory', 'salesReports', 'discounts']
    : ['dashboard', 'profile', 'salesPos', 'salesHistory', 'salesReports', 'discounts'];
}

function canAccessTab(role, routeKey) {
  return getTabRouteKeys(role).includes(routeKey);
}

function shouldVerifyStoredSession(token, user) {
  return Boolean(token && user && (user.id || user.username || user.email));
}

module.exports = {
  PUBLIC_ROUTE_NAMES,
  normalizeRole,
  getPublicRouteName,
  getTabRouteKeys,
  canAccessTab,
  shouldVerifyStoredSession,
};
