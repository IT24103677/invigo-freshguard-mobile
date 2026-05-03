import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/config';
import LoadingSpinner from '../components/LoadingSpinner';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Main Screens
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Product Screens
import ProductListScreen from '../screens/products/ProductListScreen';
import AddProductScreen from '../screens/products/AddProductScreen';
import EditProductScreen from '../screens/products/EditProductScreen';
import ProductDetailsScreen from '../screens/products/ProductDetailsScreen';

// Inventory Screens
import InventoryListScreen from '../screens/inventory/InventoryListScreen';
import AddInventoryScreen from '../screens/inventory/AddInventoryScreen';
import EditInventoryScreen from '../screens/inventory/EditInventoryScreen';
import ExpiryTrackingScreen from '../screens/inventory/ExpiryTrackingScreen';

// Sales Screens
import SalesListScreen from '../screens/sales/SalesListScreen';
import AddSaleScreen from '../screens/sales/AddSaleScreen';
import SaleDetailsScreen from '../screens/sales/SaleDetailsScreen';

// Discount Screens
import DiscountListScreen from '../screens/discounts/DiscountListScreen';
import AddDiscountScreen from '../screens/discounts/AddDiscountScreen';

// Alert Screens
import AlertsScreen from '../screens/alerts/AlertsScreen';

// User Screens
import UserListScreen from '../screens/users/UserListScreen';
import AddUserScreen from '../screens/users/AddUserScreen';
import EditUserScreen from '../screens/users/EditUserScreen';
import UserDetailsScreen from '../screens/users/UserDetailsScreen';

// Report Screens
import ReportsScreen from '../screens/reports/ReportsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: COLORS.secondary },
  headerTintColor: COLORS.white,
  headerTitleStyle: { fontWeight: '600' },
};

// Auth Stack
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Dashboard Stack
const DashboardStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="DashboardMain" component={DashboardScreen} options={{ title: 'Dashboard' }} />
  </Stack.Navigator>
);

// Products Stack
const ProductsStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="ProductList" component={ProductListScreen} options={{ title: 'Products' }} />
    <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ title: 'Add Product' }} />
    <Stack.Screen name="EditProduct" component={EditProductScreen} options={{ title: 'Edit Product' }} />
    <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} options={{ title: 'Product Details' }} />
  </Stack.Navigator>
);

// Inventory Stack
const InventoryStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="InventoryList" component={InventoryListScreen} options={{ title: 'Inventory' }} />
    <Stack.Screen name="AddInventory" component={AddInventoryScreen} options={{ title: 'Add Stock Batch' }} />
    <Stack.Screen name="EditInventory" component={EditInventoryScreen} options={{ title: 'Edit Stock Batch' }} />
    <Stack.Screen name="ExpiryTracking" component={ExpiryTrackingScreen} options={{ title: 'Expiry Tracking' }} />
  </Stack.Navigator>
);

// Sales Stack
const SalesStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="SalesList" component={SalesListScreen} options={{ title: 'Sales' }} />
    <Stack.Screen name="AddSale" component={AddSaleScreen} options={{ title: 'Record Sale' }} />
    <Stack.Screen name="SaleDetails" component={SaleDetailsScreen} options={{ title: 'Sale Details' }} />
  </Stack.Navigator>
);

// Discounts Stack
const DiscountsStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="DiscountList" component={DiscountListScreen} options={{ title: 'Discounts' }} />
    <Stack.Screen name="AddDiscount" component={AddDiscountScreen} options={{ title: 'Add Discount' }} />
  </Stack.Navigator>
);

// More Stack (Discounts, Alerts, Users, Reports, Profile)
const MoreStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="MoreMenu" component={MoreMenuScreen} options={{ title: 'More' }} />
    <Stack.Screen name="DiscountList" component={DiscountListScreen} options={{ title: 'Discounts' }} />
    <Stack.Screen name="AddDiscount" component={AddDiscountScreen} options={{ title: 'Add Discount' }} />
    <Stack.Screen name="Alerts" component={AlertsScreen} options={{ title: 'Alerts' }} />
    <Stack.Screen name="UserList" component={UserListScreen} options={{ title: 'Users' }} />
    <Stack.Screen name="AddUser" component={AddUserScreen} options={{ title: 'Add User' }} />
    <Stack.Screen name="EditUser" component={EditUserScreen} options={{ title: 'Edit User' }} />
    <Stack.Screen name="UserDetails" component={UserDetailsScreen} options={{ title: 'User Details' }} />
    <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
    <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
  </Stack.Navigator>
);

// More Menu Screen (navigation hub)
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';

const MoreMenuScreen = ({ navigation }) => {
  const { user, logout, isAdmin } = useAuth();

  const menuItems = [
    { title: 'Discounts', icon: 'tag-outline', screen: 'DiscountList' },
    { title: 'Alerts', icon: 'bell-outline', screen: 'Alerts' },
    { title: 'Reports', icon: 'chart-bar', screen: 'Reports' },
    ...(isAdmin() ? [{ title: 'User Management', icon: 'account-group-outline', screen: 'UserList' }] : []),
    { title: 'My Profile', icon: 'account-circle-outline', screen: 'Profile' },
  ];

  return (
    <View style={menuStyles.container}>
      <View style={menuStyles.header}>
        <Text style={menuStyles.greeting}>Hello, {user?.name || 'User'}</Text>
        <Text style={menuStyles.role}>{user?.role}</Text>
      </View>
      <Divider />
      {menuItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={menuStyles.menuItem}
          onPress={() => navigation.navigate(item.screen)}
        >
          <Icon source={item.icon} size={24} color={COLORS.primary} />
          <Text style={menuStyles.menuText}>{item.title}</Text>
          <Icon source="chevron-right" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
      ))}
      <Divider style={{ marginTop: 16 }} />
      <TouchableOpacity style={menuStyles.logoutBtn} onPress={logout}>
        <Icon source="logout" size={24} color={COLORS.error} />
        <Text style={[menuStyles.menuText, { color: COLORS.error }]}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const menuStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, backgroundColor: COLORS.secondary },
  greeting: { fontSize: 20, fontWeight: '700', color: COLORS.white },
  role: { fontSize: 13, color: COLORS.primaryLight, marginTop: 4 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  menuText: { flex: 1, fontSize: 16, color: COLORS.text, marginLeft: 16 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16,
  },
});

// Main Tab Navigator
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textLight,
      tabBarStyle: {
        backgroundColor: COLORS.surface,
        borderTopColor: COLORS.border,
        height: 60,
        paddingBottom: 8,
        paddingTop: 4,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      tabBarIcon: ({ color, size }) => {
        let iconName;
        switch (route.name) {
          case 'Dashboard': iconName = 'view-dashboard-outline'; break;
          case 'Products': iconName = 'package-variant-closed'; break;
          case 'Discounts': iconName = 'tag-outline'; break;
          case 'Inventory': iconName = 'warehouse'; break;
          case 'Sales': iconName = 'cart-outline'; break;
          case 'More': iconName = 'dots-horizontal-circle-outline'; break;
          default: iconName = 'circle';
        }
        return <Icon source={iconName} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardStack} />
    <Tab.Screen name="Products" component={ProductsStack} />
    <Tab.Screen name="Discounts" component={DiscountsStack} />
    <Tab.Screen name="Inventory" component={InventoryStack} />
    <Tab.Screen name="Sales" component={SalesStack} />
    <Tab.Screen name="More" component={MoreStack} />
  </Tab.Navigator>
);

// Main App Navigator
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <MainTabs />
    </NavigationContainer>
  );
};

export default AppNavigator;
