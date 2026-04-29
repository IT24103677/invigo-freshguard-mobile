import React, { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import Logo from '../components/Logo';
import { getCurrentUser, getLoginHistory, getSuppliers, getUsers } from '../api';
import { saveSession } from '../session';
import { colors } from '../theme';

function cleanRole(role) {
  return String(role || '').toUpperCase();
}

function normaliseProfile(user) {
  return {
    ...user,
    status: user?.status || 'ACTIVE',
    role: user?.role || 'STAFF',
    accountLocked: Boolean(user?.accountLocked),
    lastLoginAt: user?.lastLoginAt || '',
  };
}

function formatDateShort(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}

function formatRoleLabel(role) {
  return cleanRole(role) === 'ADMIN' ? 'Admin' : 'Staff';
}

function formatAccountLabel(status, accountLocked) {
  if (accountLocked) return 'Locked';
  return String(status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'Active' : 'Inactive';
}

function StatCard({ value, label, icon, color, compact = false, wide = false }) {
  return (
    <View style={[styles.statCard, compact && styles.statCardCompact, wide && styles.statCardWide]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text
        style={[styles.statValue, compact && styles.statValueCompact]}
        numberOfLines={compact ? 2 : 1}
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ModuleCard({ title, subtitle, icon, color, onPress }) {
  return (
    <Pressable style={styles.moduleCard} onPress={onPress}>
      <View style={[styles.moduleIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.moduleTitle}>{title}</Text>
        <Text style={styles.moduleSubtitle}>{subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="rgba(15,23,42,0.35)" />
    </Pressable>
  );
}

export default function DashboardScreen({ go, sessionUser, setSessionUser, onLogout }) {
  const [profile, setProfile] = useState(normaliseProfile(sessionUser || {}));
  const [summary, setSummary] = useState({
    userCount: 0,
    supplierCount: 0,
    lockedCount: 0,
    failedLoginCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = cleanRole(profile.role) === 'ADMIN';
  const name = profile?.name || profile?.username || 'User';
  const roleLabel = formatRoleLabel(profile.role);
  const accountLabel = formatAccountLabel(profile.status, profile.accountLocked);
  const lastLoginLabel = formatDateShort(profile.lastLoginAt);

  useEffect(() => {
    setProfile(normaliseProfile(sessionUser || {}));
  }, [sessionUser]);

  useEffect(() => {
    loadDashboard();
  }, [sessionUser?.id]);

  async function syncProfile(nextProfile) {
    const merged = normaliseProfile({ ...(sessionUser || {}), ...nextProfile });
    setProfile(merged);
    setSessionUser(merged);
    await saveSession({ user: merged });
  }

  async function loadDashboard() {
    setLoading(true);
    setError('');

    try {
      if (cleanRole(sessionUser?.role) === 'ADMIN') {
        const [profileResult, usersResult, suppliersResult, historyResult] = await Promise.allSettled([
          getCurrentUser(),
          getUsers(),
          getSuppliers(),
          getLoginHistory(),
        ]);

        const issues = [];

        if (profileResult.status === 'fulfilled') {
          await syncProfile(profileResult.value);
        } else {
          issues.push(profileResult.reason?.message || 'Could not refresh your account details.');
        }

        const users = usersResult.status === 'fulfilled' ? usersResult.value : [];
        const suppliers = suppliersResult.status === 'fulfilled' ? suppliersResult.value : [];
        const history = historyResult.status === 'fulfilled' ? historyResult.value : [];

        if (usersResult.status === 'rejected') issues.push(usersResult.reason?.message || 'Could not load users.');
        if (suppliersResult.status === 'rejected') issues.push(suppliersResult.reason?.message || 'Could not load suppliers.');
        if (historyResult.status === 'rejected') issues.push(historyResult.reason?.message || 'Could not load login activity.');

        const activeUsers = users.filter((user) => String(user.status || 'ACTIVE').toUpperCase() === 'ACTIVE');
        const lockedUsers = activeUsers.filter((user) => Boolean(user.accountLocked) && cleanRole(user.role) !== 'ADMIN');
        const failedLogins = history.filter((entry) => String(entry.status || '').toUpperCase() === 'FAILED');

        setSummary({
          userCount: activeUsers.length,
          supplierCount: suppliers.length,
          lockedCount: lockedUsers.length,
          failedLoginCount: failedLogins.length,
        });

        setError(issues.join(' '));
      } else {
        const currentUser = await getCurrentUser();
        await syncProfile(currentUser);
        setSummary({
          userCount: 0,
          supplierCount: 0,
          lockedCount: 0,
          failedLoginCount: 0,
        });
      }
    } catch (loadError) {
      setError(loadError.message || 'Could not load dashboard data right now.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDashboard} />}
      >
        <View style={styles.header}>
          <Logo size={38} textSize={28} />

          <Pressable style={styles.logoutButtonTop} onPress={onLogout} hitSlop={10}>
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={styles.logoutTextTop}>Logout</Text>
          </Pressable>
        </View>

        <View style={styles.rolePill}>
          <Ionicons
            name={isAdmin ? 'shield-checkmark-outline' : 'person-outline'}
            size={15}
            color={colors.purple}
          />
          <Text style={styles.roleText}>{isAdmin ? 'Admin' : 'Staff'}</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.subtitle}>
            {isAdmin
              ? 'Monitor your team, suppliers, and account activity from one live workspace.'
              : 'Use your profile area to review your account details and change your password.'}
          </Text>
        </View>

        {!!error && <Text style={styles.warn}>{error}</Text>}

        {isAdmin ? (
          <View style={styles.statsRow}>
            <>
              <StatCard
                value={summary.userCount}
                label="Active Users"
                icon="people-outline"
                color={colors.purple}
              />
              <StatCard
                value={summary.supplierCount}
                label="Suppliers"
                icon="business-outline"
                color={colors.emerald}
              />
              <StatCard
                value={summary.lockedCount}
                label="Locked"
                icon="lock-closed-outline"
                color={colors.danger}
              />
            </>
          </View>
        ) : (
          <View style={styles.staffStatsSection}>
            <View style={styles.staffStatsGrid}>
              <StatCard
                value={roleLabel}
                label="Access Level"
                icon="person-outline"
                color={colors.purple}
                compact
              />
              <StatCard
                value={accountLabel}
                label="Account Status"
                icon="shield-outline"
                color={profile.accountLocked ? colors.danger : colors.emerald}
                compact
              />
            </View>
            <StatCard
                value={lastLoginLabel}
                label="Last Login"
                icon="time-outline"
                color={colors.magenta}
                wide
              />
          </View>
        )}

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Available Modules</Text>
              <Text style={styles.sectionTitle}>Choose your workspace</Text>
            </View>
          </View>

          <View style={styles.modules}>
            {isAdmin && (
              <ModuleCard
                title="User Management"
                subtitle="Create, edit, unlock, and revoke staff access."
                icon="people-outline"
                color={colors.purple}
                onPress={() => go('adminUsers')}
              />
            )}

            {isAdmin && (
              <ModuleCard
                title="Supplier Management"
                subtitle="Manage supplier details, categories, ratings, and status."
                icon="business-outline"
                color={colors.emerald}
                onPress={() => go('suppliers')}
              />
            )}

            {!isAdmin && (
              <ModuleCard
                title="My Profile"
                subtitle="Review your account details and update your password."
                icon="person-outline"
                color={colors.magenta}
                onPress={() => go('profile')}
              />
            )}
          </View>
        </Card>

        <Card style={styles.noticeCard}>
          <View style={styles.noticeIcon}>
            <Ionicons
              name={isAdmin ? 'shield-checkmark-outline' : 'sparkles-outline'}
              size={22}
              color={summary.lockedCount > 0 ? colors.danger : colors.emerald}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.noticeTitle}>{isAdmin ? 'Operations Snapshot' : 'Account Snapshot'}</Text>
            <Text style={styles.noticeText}>
              {isAdmin
                ? summary.lockedCount > 0
                  ? `There are ${summary.lockedCount} locked staff accounts waiting for review.`
                  : `All active staff accounts are currently unlocked. Failed logins recorded: ${summary.failedLoginCount}.`
                : profile.accountLocked
                  ? 'Your account is currently locked. Please contact an administrator.'
                  : `You are signed in with ${profile.role || 'STAFF'} access under the fixed admin/staff role system.`}
            </Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 58,
    paddingBottom: 120,
  },

  header: {
    gap: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
    marginTop: 14,
  },

  roleText: {
    color: colors.purple,
    fontSize: 12,
    fontWeight: '900',
  },

  logoutButtonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 104,
    justifyContent: 'center',
  },

  logoutTextTop: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '900',
  },

  hero: {
    marginTop: 30,
  },

  greeting: {
    color: 'rgba(15,23,42,0.50)',
    fontSize: 15,
    fontWeight: '800',
  },

  name: {
    marginTop: 4,
    color: colors.slate,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '900',
    letterSpacing: -1.4,
  },

  subtitle: {
    marginTop: 12,
    color: 'rgba(15,23,42,0.58)',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },

  warn: {
    marginTop: 18,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    color: '#92400E',
    padding: 12,
    borderRadius: 16,
    fontWeight: '800',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 26,
  },

  staffStatsSection: {
    marginTop: 26,
    gap: 10,
  },

  staffStatsGrid: {
    flexDirection: 'row',
    gap: 10,
  },

  statCard: {
    flex: 1,
    minHeight: 118,
    borderRadius: 24,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: colors.border,
  },

  statCardCompact: {
    minHeight: 132,
  },

  statCardWide: {
    minHeight: 110,
  },

  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  statValue: {
    color: colors.slate,
    fontSize: 24,
    fontWeight: '900',
  },

  statValueCompact: {
    fontSize: 20,
    lineHeight: 24,
  },

  statLabel: {
    marginTop: 2,
    color: 'rgba(15,23,42,0.45)',
    fontSize: 11,
    fontWeight: '800',
  },

  sectionCard: {
    marginTop: 22,
  },

  sectionHeader: {
    marginBottom: 16,
  },

  sectionEyebrow: {
    color: colors.purple,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },

  sectionTitle: {
    marginTop: 5,
    color: colors.slate,
    fontSize: 22,
    fontWeight: '900',
  },

  modules: {
    gap: 12,
  },

  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(248,250,252,0.86)',
    borderWidth: 1,
    borderColor: colors.border,
  },

  moduleIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  moduleTitle: {
    color: colors.slate,
    fontSize: 15,
    fontWeight: '900',
  },

  moduleSubtitle: {
    marginTop: 3,
    color: 'rgba(15,23,42,0.48)',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },

  noticeCard: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  noticeIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,122,94,0.12)',
  },

  noticeTitle: {
    color: colors.slate,
    fontSize: 15,
    fontWeight: '900',
  },

  noticeText: {
    marginTop: 3,
    color: 'rgba(15,23,42,0.52)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
});
