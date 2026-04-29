import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BottomNav from './src/components/BottomNav';
import { getCurrentUser, setUnauthorizedHandler } from './src/api';
import { clearSession, getAuthToken, getSessionUser, saveSession } from './src/session';
import AdminUsersScreen from './src/screens/AdminUsersScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SupplierManagementScreen from './src/screens/SupplierManagementScreen';
import { colors } from './src/theme';

const {
  normalizeRole,
  getPublicRouteName,
  canAccessTab,
  shouldVerifyStoredSession,
} = require('./src/navigation/helpers.cjs');

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function buildUserSession(cachedUser, currentUser) {
  const merged = { ...(cachedUser || {}), ...(currentUser || {}) };
  return {
    id: merged.id,
    username: merged.username,
    name: merged.name,
    email: merged.email,
    doj: merged.doj,
    role: normalizeRole(merged.role),
    accountLocked: Boolean(merged.accountLocked),
    status: merged.status || 'ACTIVE',
    lastLoginAt: merged.lastLoginAt || '',
  };
}

function buildAuthGo(navigation) {
  return (target) => navigation.navigate(getPublicRouteName(target));
}

function buildAppGo(navigation, role) {
  return (target) => {
    if (canAccessTab(role, target)) {
      navigation.navigate(target);
    }
  };
}

function AdminTabs({ sessionUser, setSessionUser, onLogout }) {
  return (
    <Tab.Navigator
      initialRouteName="dashboard"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomNav {...props} role="ADMIN" />}
    >
      <Tab.Screen name="dashboard">
        {({ navigation }) => (
          <DashboardScreen
            go={buildAppGo(navigation, 'ADMIN')}
            sessionUser={sessionUser}
            setSessionUser={setSessionUser}
            onLogout={onLogout}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="adminUsers">
        {({ navigation }) => (
          <AdminUsersScreen
            go={buildAppGo(navigation, 'ADMIN')}
            sessionUser={sessionUser}
            setSessionUser={setSessionUser}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="suppliers">
        {({ navigation }) => (
          <SupplierManagementScreen
            go={buildAppGo(navigation, 'ADMIN')}
            sessionUser={sessionUser}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function StaffTabs({ sessionUser, setSessionUser, onLogout }) {
  return (
    <Tab.Navigator
      initialRouteName="dashboard"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomNav {...props} role="STAFF" />}
    >
      <Tab.Screen name="dashboard">
        {({ navigation }) => (
          <DashboardScreen
            go={buildAppGo(navigation, 'STAFF')}
            sessionUser={sessionUser}
            setSessionUser={setSessionUser}
            onLogout={onLogout}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="profile">
        {() => (
          <ProfileScreen
            sessionUser={sessionUser}
            setSessionUser={setSessionUser}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [sessionUser, setSessionUser] = useState(null);
  const [authEntry, setAuthEntry] = useState('landing');

  const userRole = normalizeRole(sessionUser?.role);
  const isLoggedIn = Boolean(sessionUser);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSessionUser(null);
      setAuthEntry('login');
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    let active = true;

    async function boot() {
      try {
        const [token, cachedUser] = await Promise.all([
          getAuthToken().catch(() => ''),
          getSessionUser().catch(() => null),
        ]);

        if (!shouldVerifyStoredSession(token, cachedUser)) {
          if (active) {
            setSessionUser(null);
            setAuthEntry('landing');
          }
          return;
        }

        const currentUser = await getCurrentUser();
        const nextUser = buildUserSession(cachedUser, currentUser);
        await saveSession({ token, user: nextUser });

        if (active) {
          setSessionUser(nextUser);
        }
      } catch (error) {
        await clearSession().catch(() => null);
        if (active) {
          setSessionUser(null);
          setAuthEntry('login');
        }
      } finally {
        if (active) {
          setBooting(false);
        }
      }
    }

    boot();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    await clearSession();
    setSessionUser(null);
    setAuthEntry('login');
  }

  const navigationTheme = useMemo(() => ({
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.background,
      text: colors.slate,
      primary: colors.purple,
      border: 'transparent',
      notification: colors.danger,
    },
  }), []);

  const linking = useMemo(() => ({
    prefixes: [Linking.createURL('/')],
    config: {
      screens: {
        Landing: '',
        Login: 'login',
        ForgotPassword: 'forgot',
        AdminApp: {
          screens: {
            dashboard: 'admin/dashboard',
            adminUsers: 'admin/users',
            suppliers: 'admin/suppliers',
          },
        },
        StaffApp: {
          screens: {
            dashboard: 'staff/dashboard',
            profile: 'staff/profile',
          },
        },
      },
    },
  }), []);

  if (booting) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <ActivityIndicator color={colors.emerald} size="large" />
        <Text style={styles.loadingText}>Loading Invigo...</Text>
      </View>
    );
  }

  return (
    <View style={styles.appRoot}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <NavigationContainer theme={navigationTheme} linking={linking}>
        {isLoggedIn ? (
          <RootStack.Navigator key={userRole} screenOptions={{ headerShown: false }}>
            {userRole === 'ADMIN' ? (
              <RootStack.Screen name="AdminApp">
                {() => (
                  <AdminTabs
                    sessionUser={sessionUser}
                    setSessionUser={setSessionUser}
                    onLogout={handleLogout}
                  />
                )}
              </RootStack.Screen>
            ) : (
              <RootStack.Screen name="StaffApp">
                {() => (
                  <StaffTabs
                    sessionUser={sessionUser}
                    setSessionUser={setSessionUser}
                    onLogout={handleLogout}
                  />
                )}
              </RootStack.Screen>
            )}
          </RootStack.Navigator>
        ) : (
          <RootStack.Navigator
            key={authEntry}
            initialRouteName={getPublicRouteName(authEntry)}
            screenOptions={{ headerShown: false }}
          >
            <RootStack.Screen name="Landing">
              {({ navigation }) => <LandingScreen go={buildAuthGo(navigation)} />}
            </RootStack.Screen>
            <RootStack.Screen name="Login">
              {({ navigation }) => (
                <LoginScreen
                  go={buildAuthGo(navigation)}
                  setSessionUser={(user) => setSessionUser(buildUserSession(sessionUser, user))}
                />
              )}
            </RootStack.Screen>
            <RootStack.Screen name="ForgotPassword">
              {({ navigation }) => <ForgotPasswordScreen go={buildAuthGo(navigation)} />}
            </RootStack.Screen>
          </RootStack.Navigator>
        )}
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },

  loadingText: {
    marginTop: 12,
    color: 'rgba(15,23,42,0.55)',
    fontWeight: '900',
    letterSpacing: 1,
  },
});
