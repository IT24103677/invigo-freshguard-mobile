const NAV_ITEMS = [
  { key: 'home', label: 'Home Page', icon: 'home-outline', title: 'Home Page' },
  { key: 'staffDesk', label: 'Staff Desk', icon: 'grid-outline', title: 'Staff Desk' },
  { key: 'products', label: 'Products', icon: 'cube-outline', title: 'Products' },
  { key: 'inventory', label: 'Inventory', icon: 'search-outline', title: 'Rapid Scan' },
  { key: 'discounts', label: 'Discounts', icon: 'pricetag-outline', title: 'Discounts' },
  { key: 'alerts', label: 'My Alerts', icon: 'notifications-outline', title: 'My Alerts' },
  { key: 'sales', label: 'Sales Entry', icon: 'checkmark-circle-outline', title: 'Sales Entry' },
  { key: 'reports', label: 'Reports', icon: 'stats-chart-outline', title: 'Reports' },
  { key: 'profile', label: 'My Profile', icon: 'person-circle-outline', title: 'My Profile' },
];

function getNavItems() {
  return NAV_ITEMS.slice();
}

function isWorkingModule(routeKey) {
  return routeKey === 'inventory';
}

function getHeaderTitle(routeKey) {
  return NAV_ITEMS.find((item) => item.key === routeKey)?.title || 'Rapid Scan';
}

module.exports = {
  NAV_ITEMS,
  getNavItems,
  isWorkingModule,
  getHeaderTitle,
};
