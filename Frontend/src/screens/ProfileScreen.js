import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import FormInput from '../components/FormInput';
import Logo from '../components/Logo';
import PrimaryButton from '../components/PrimaryButton';
import { changeMyPassword, getCurrentUser } from '../api';
import { saveSession } from '../session';
import { colors } from '../theme';

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,30}$/;

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
    doj: user?.doj || '',
  };
}

function formatDateTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ProfileScreen({ sessionUser, setSessionUser }) {
  const [profile, setProfile] = useState(normaliseProfile(sessionUser || {}));
  const [refreshing, setRefreshing] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const role = cleanRole(profile.role);
  const name = profile?.name || profile?.username || 'User';
  const email = profile?.email || 'No email available';

  useEffect(() => {
    setProfile(normaliseProfile(sessionUser || {}));
  }, [sessionUser]);

  useEffect(() => {
    refreshProfile();
  }, [sessionUser?.id]);

  function updatePasswordField(key, value) {
    setPasswordForm((current) => ({ ...current, [key]: value }));
  }

  async function refreshProfile() {
    setRefreshing(true);
    setError('');
    try {
      const currentUser = await getCurrentUser();
      const merged = normaliseProfile({ ...(sessionUser || {}), ...currentUser });
      setProfile(merged);
      setSessionUser(merged);
      await saveSession({ user: merged });
    } catch (loadError) {
      setError(loadError.message || 'Could not refresh your profile right now.');
    } finally {
      setRefreshing(false);
    }
  }

  async function submitPasswordChange() {
    const currentPassword = String(passwordForm.currentPassword || '');
    const newPassword = String(passwordForm.newPassword || '');
    const confirmPassword = String(passwordForm.confirmPassword || '');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setSuccess('');
      setError('Please fill current password, new password, and confirmation.');
      return;
    }

    if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
      setSuccess('');
      setError('Password must be 8 to 30 characters and include uppercase, lowercase, and a number.');
      return;
    }

    if (currentPassword === newPassword) {
      setSuccess('');
      setError('New password must be different from your current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSuccess('');
      setError('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    setError('');
    setSuccess('');

    try {
      const response = await changeMyPassword(currentPassword, newPassword, confirmPassword);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setSuccess(response.message || 'Password updated successfully.');
    } catch (saveError) {
      setError(saveError.message || 'Could not update your password right now.');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshProfile} />}
      >
        <View style={styles.header}>
          <Logo />

          <View style={styles.rolePill}>
            <Ionicons
              name="person-outline"
              size={15}
              color={colors.purple}
            />
            <Text style={styles.roleText}>{role}</Text>
          </View>
        </View>

        <View style={styles.profileTop}>
          <View style={[styles.avatar, { backgroundColor: colors.emerald }]}>
            <Text style={styles.avatarText}>
              {String(name).slice(0, 2).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{email}</Text>
          <Text style={styles.roleBadge}>{role}</Text>
        </View>

        {!!error && <Text style={styles.warn}>{error}</Text>}
        {!!success && <Text style={styles.success}>{success}</Text>}

        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Account Information</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="person-outline" size={20} color={colors.purple} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>{profile.username || name}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail-outline" size={20} color={colors.emerald} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>{email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="key-outline" size={20} color={colors.magenta} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{role}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="calendar-outline" size={20} color={colors.warning} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Joined On</Text>
              <Text style={styles.infoValue}>{profile.doj || '--'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="time-outline" size={20} color={colors.slate} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Last Login</Text>
              <Text style={styles.infoValue}>{formatDateTime(profile.lastLoginAt)}</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.securityCard}>
          <View style={styles.securityHeader}>
            <View style={[styles.securityIcon, { backgroundColor: profile.accountLocked ? 'rgba(239,68,68,0.12)' : 'rgba(0,122,94,0.12)' }]}>
              <Ionicons
                name={profile.accountLocked ? 'alert-circle-outline' : 'lock-closed-outline'}
                size={22}
                color={profile.accountLocked ? colors.danger : colors.emerald}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.securityTitle}>Security Status</Text>
              <Text style={styles.securityText}>
                {profile.accountLocked
                  ? 'This account is locked. Please contact an administrator.'
                  : `Account status: ${String(profile.status || 'ACTIVE').toUpperCase()}. You can update your own password from this screen.`}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={styles.passwordCard}>
          <Text style={styles.sectionTitle}>Update Password</Text>
          <Text style={styles.passwordSub}>
            Use your current password first, then choose a stronger new one.
          </Text>

          <View style={styles.passwordFields}>
            <FormInput
              label="Current Password"
              icon="lock-closed-outline"
              value={passwordForm.currentPassword}
              onChangeText={(value) => updatePasswordField('currentPassword', value)}
              placeholder="Enter current password"
              secureTextEntry
            />
            <FormInput
              label="New Password"
              icon="shield-checkmark-outline"
              value={passwordForm.newPassword}
              onChangeText={(value) => updatePasswordField('newPassword', value)}
              placeholder="8-30 chars, upper/lower/number"
              secureTextEntry
            />
            <FormInput
              label="Confirm New Password"
              icon="checkmark-done-outline"
              value={passwordForm.confirmPassword}
              onChangeText={(value) => updatePasswordField('confirmPassword', value)}
              placeholder="Repeat new password"
              secureTextEntry
            />
            <PrimaryButton title="Update Password" onPress={submitPasswordChange} loading={savingPassword} />
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
    paddingBottom: 130,
  },

  header: {
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
  },

  roleText: {
    color: colors.purple,
    fontSize: 12,
    fontWeight: '900',
  },

  profileTop: {
    alignItems: 'center',
    marginTop: 36,
    marginBottom: 24,
  },

  avatar: {
    width: 92,
    height: 92,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  avatarText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
  },

  name: {
    marginTop: 16,
    color: colors.slate,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },

  email: {
    marginTop: 4,
    color: 'rgba(15,23,42,0.52)',
    fontSize: 13,
    fontWeight: '700',
  },

  roleBadge: {
    marginTop: 8,
    color: colors.purple,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  warn: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    color: '#92400E',
    padding: 12,
    borderRadius: 16,
    fontWeight: '800',
    marginBottom: 16,
  },

  success: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    color: colors.emerald,
    padding: 12,
    borderRadius: 16,
    fontWeight: '800',
    marginBottom: 16,
  },

  infoCard: {
    gap: 16,
  },

  sectionTitle: {
    color: colors.slate,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 4,
  },

  infoIcon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: 'rgba(248,250,252,0.90)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  infoLabel: {
    color: 'rgba(15,23,42,0.44)',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  infoValue: {
    marginTop: 3,
    color: colors.slate,
    fontSize: 14,
    fontWeight: '800',
  },

  securityCard: {
    marginTop: 16,
  },

  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },

  securityIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  securityTitle: {
    color: colors.slate,
    fontSize: 16,
    fontWeight: '900',
  },

  securityText: {
    marginTop: 3,
    color: 'rgba(15,23,42,0.52)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  passwordCard: {
    marginTop: 16,
  },

  passwordSub: {
    marginTop: 4,
    color: 'rgba(15,23,42,0.52)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  passwordFields: {
    gap: 12,
    marginTop: 16,
  },
});
