import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createUser, deleteUser, getLoginHistory, getUsers, unlockUser, updateUser } from '../api';
import Card from '../components/Card';
import FormInput from '../components/FormInput';
import PrimaryButton, { GhostButton } from '../components/PrimaryButton';
import Screen from '../components/Screen';
import { saveSession } from '../session';
import TopBar from '../components/TopBar';
import { colors } from '../theme';

const ROLE_OPTIONS = ['ADMIN', 'STAFF'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-z0-9._-]{3,30}$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,30}$/;
const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function cleanRole(role) {
  return String(role || '').toUpperCase();
}

function getTodayDateOnly() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDateOnly(value) {
  const clean = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return false;
  const date = new Date(`${clean}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === clean;
}

function isFutureDateOnly(value) {
  return String(value || '').trim() > getTodayDateOnly();
}

function formatDateFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateOnlyToLocalDate(value) {
  if (!isValidDateOnly(value)) return new Date();
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthLabel(date) {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

function canGoToNextMonth(viewDate) {
  const nextMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return nextMonth <= currentMonth;
}

function buildCalendarDays(viewDate) {
  const firstDay = startOfMonth(viewDate);
  const year = firstDay.getFullYear();
  const month = firstDay.getMonth();
  const firstWeekday = firstDay.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const days = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day);
    const value = formatDateFromDate(date);
    days.push({
      value,
      label: String(day),
      disabled: isFutureDateOnly(value),
    });
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function DateField({ label, value, onPress, active }) {
  return (
    <View style={styles.wrap}>
      {!!label && <Text style={styles.inputLabel}>{label}</Text>}
      <Pressable onPress={onPress} style={[styles.dateFieldWrap, active && styles.dateFieldWrapActive]}>
        <Ionicons name="calendar-outline" size={19} color="rgba(15,23,42,0.35)" style={styles.dateFieldIcon} />
        <Text style={[styles.dateFieldText, !value && styles.datePlaceholder]}>
          {value || 'YYYY-MM-DD'}
        </Text>
      </Pressable>
    </View>
  );
}

function normaliseUser(user) {
  return {
    ...user,
    id: user?.id || user?._id,
    role: cleanRole(user?.role || 'STAFF'),
    status: user?.status || 'ACTIVE',
    accountLocked: Boolean(user?.accountLocked),
  };
}

function Stat({ label, value, icon, color }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TabButton({ active, title, onPress, badge }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabBtn, active && styles.tabBtnActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text>
      {!!badge && <Text style={styles.badge}>{badge}</Text>}
    </Pressable>
  );
}

function RoleSelector({ value, onChange }) {
  return (
    <View style={styles.roleWrap}>
      <Text style={styles.smallLabel}>Role</Text>
      <View style={styles.roleGrid}>
        {ROLE_OPTIONS.map((role) => (
          <Pressable
            key={role}
            onPress={() => onChange(role)}
            style={[styles.roleOption, value === role && styles.roleOptionActive]}
          >
            <Text style={[styles.roleOptionText, value === role && styles.roleOptionTextActive]}>
              {role}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function UserCard({ user, onEdit, onDelete, onUnlock }) {
  const locked = Boolean(user.accountLocked);
  const isAdmin = cleanRole(user.role) === 'ADMIN';
  const canEdit = !isAdmin;

  return (
    <Card style={styles.userCard}>
      <View style={styles.userTop}>
        <View style={[styles.avatar, { backgroundColor: isAdmin ? colors.purple : colors.emerald }]}>
          <Text style={styles.avatarText}>{String(user.name || user.username || '?').slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user.name || 'Unnamed User'}</Text>
          <Text style={styles.userMeta}>@{user.username || '-'} | {user.email || 'no email'}</Text>
        </View>
        {locked && <Ionicons name="lock-closed" size={20} color={colors.danger} />}
      </View>

      <View style={styles.tagsRow}>
        <Text style={[styles.tag, { backgroundColor: isAdmin ? 'rgba(124,58,237,0.12)' : 'rgba(0,122,94,0.12)', color: isAdmin ? colors.purple : colors.emerald }]}>
          {user.role || 'STAFF'}
        </Text>
        <Text style={styles.tag}>Status {String(user.status || 'ACTIVE').toUpperCase()}</Text>
        <Text style={styles.tag}>DOJ {user.doj || '--'}</Text>
      </View>

      <View style={styles.actionRow}>
        {canEdit && (
          <Pressable style={styles.smallBtn} onPress={() => onEdit(user)}>
            <Text style={styles.smallBtnText}>Edit</Text>
          </Pressable>
        )}
        {locked && (
          <Pressable style={styles.smallBtn} onPress={() => onUnlock(user)}>
            <Text style={[styles.smallBtnText, { color: colors.emerald }]}>Unlock</Text>
          </Pressable>
        )}
        {!isAdmin && (
          <Pressable
            style={styles.smallBtn}
            onPress={() => onDelete(user)}
          >
            <Text style={[styles.smallBtnText, { color: colors.danger }]}>Delete</Text>
          </Pressable>
        )}
      </View>
    </Card>
  );
}

function UserModal({ visible, onClose, onSubmit, initialUser, loading }) {
  const isEdit = Boolean(initialUser);
  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    doj: '',
    role: 'STAFF',
    email: '',
  });
  const [error, setError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const nextMonthDisabled = !canGoToNextMonth(calendarMonth);

  useEffect(() => {
    if (!visible) return;

    setError('');
    setShowDatePicker(false);
    setCalendarMonth(startOfMonth(parseDateOnlyToLocalDate(initialUser?.doj || getTodayDateOnly())));
    setForm(initialUser ? {
      username: initialUser.username || '',
      password: '',
      name: initialUser.name || '',
      doj: initialUser.doj || '',
      role: cleanRole(initialUser.role || 'STAFF'),
      email: initialUser.email || '',
    } : {
      username: '',
      password: '',
      name: '',
      doj: '',
      role: 'STAFF',
      email: '',
    });
  }, [visible, initialUser]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openDatePicker() {
    setCalendarMonth(startOfMonth(parseDateOnlyToLocalDate(form.doj || getTodayDateOnly())));
    setShowDatePicker((current) => !current);
  }

  function goToPreviousMonth() {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    if (nextMonthDisabled) return;
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  function selectDate(value) {
    update('doj', value);
    setShowDatePicker(false);
  }

  function submit() {
    const cleanUsername = String(form.username || '').trim().toLowerCase();
    const cleanName = String(form.name || '').trim();
    const cleanEmail = String(form.email || '').trim().toLowerCase();
    const cleanDoj = String(form.doj || '').trim();

    if (!cleanUsername || !cleanName || !cleanEmail || !cleanDoj || !form.role) {
      setError('Please fill username, full name, email, joining date, and role.');
      return;
    }

    if (!USERNAME_REGEX.test(cleanUsername)) {
      setError('Username must be 3 to 30 characters using letters, numbers, dots, hyphens, or underscores.');
      return;
    }

    if (cleanName.length < 3) {
      setError('Full name must be at least 3 characters.');
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!isValidDateOnly(cleanDoj)) {
      setError('Joining date must be a valid date in YYYY-MM-DD format.');
      return;
    }

    if (isFutureDateOnly(cleanDoj)) {
      setError('Joining date cannot be in the future.');
      return;
    }

    if (!isEdit && !form.password) {
      setError('Please set a password when creating a new user.');
      return;
    }

    if (form.password && !STRONG_PASSWORD_REGEX.test(form.password)) {
      setError('Password must be 8 to 30 characters and include uppercase, lowercase, and a number.');
      return;
    }

    if (!ROLE_OPTIONS.includes(cleanRole(form.role))) {
      setError('Role must be ADMIN or STAFF.');
      return;
    }

    onSubmit({
      ...form,
      username: cleanUsername,
      name: cleanName,
      email: cleanEmail,
      doj: cleanDoj,
      role: cleanRole(form.role),
    }, initialUser);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalTop}>
            <Text style={styles.modalTitle}>{isEdit ? 'Edit User' : 'Create User'}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.slate} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {!!error && <Text style={styles.error}>{error}</Text>}
            <FormInput label="Username" icon="person-outline" value={form.username} onChangeText={(value) => update('username', value)} placeholder="staff.username" />
            <FormInput label="Full Name" icon="id-card-outline" value={form.name} onChangeText={(value) => update('name', value)} placeholder="Full name" autoCapitalize="words" />
            <FormInput label="Email" icon="mail-outline" value={form.email} onChangeText={(value) => update('email', value)} placeholder="staff@example.com" keyboardType="email-address" />
            <DateField label="Joining Date" value={form.doj} onPress={openDatePicker} active={showDatePicker} />
            {showDatePicker && (
              <View style={styles.calendarCard}>
                <View style={styles.calendarHeader}>
                  <Pressable onPress={goToPreviousMonth} style={styles.calendarNavBtn}>
                    <Ionicons name="chevron-back" size={18} color={colors.slate} />
                  </Pressable>
                  <Text style={styles.calendarTitle}>{getMonthLabel(calendarMonth)}</Text>
                  <Pressable onPress={goToNextMonth} style={[styles.calendarNavBtn, nextMonthDisabled && styles.calendarNavBtnDisabled]}>
                    <Ionicons name="chevron-forward" size={18} color={nextMonthDisabled ? 'rgba(15,23,42,0.22)' : colors.slate} />
                  </Pressable>
                </View>

                <View style={styles.weekdayRow}>
                  {WEEKDAY_LABELS.map((day) => (
                    <Text key={day} style={styles.weekdayLabel}>{day}</Text>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {calendarDays.map((day, index) => {
                    if (!day) {
                      return <View key={`empty-${index}`} style={[styles.calendarDayCell, styles.calendarDayEmpty]} />;
                    }

                    const selected = form.doj === day.value;

                    return (
                      <Pressable
                        key={day.value}
                        onPress={() => selectDate(day.value)}
                        disabled={day.disabled}
                        style={[
                          styles.calendarDayCell,
                          day.disabled && styles.calendarDayDisabled,
                          selected && styles.calendarDaySelected,
                        ]}
                      >
                        <Text style={[
                          styles.calendarDayText,
                          day.disabled && styles.calendarDayTextDisabled,
                          selected && styles.calendarDayTextSelected,
                        ]}>
                          {day.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable onPress={() => setShowDatePicker(false)} style={styles.calendarCloseBtn}>
                  <Text style={styles.calendarCloseText}>Close</Text>
                </Pressable>
              </View>
            )}
            <FormInput label={isEdit ? 'New Password Optional' : 'Password'} icon="lock-closed-outline" value={form.password} onChangeText={(value) => update('password', value)} placeholder="Minimum 8 characters" secureTextEntry />
            <RoleSelector value={form.role} onChange={(value) => update('role', value)} />
            <PrimaryButton title={isEdit ? 'Save Changes' : 'Create User'} onPress={submit} loading={loading} variant="purple" />
            <GhostButton title="Cancel" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function AdminUsersScreen({ go, sessionUser, setSessionUser }) {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [history, setHistory] = useState([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalUser, setModalUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    const search = query.trim().toLowerCase();
    return users.filter((user) => {
      const haystack = `${user.name || ''} ${user.username || ''} ${user.email || ''}`.toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      const matchesRole = roleFilter === 'ALL' || cleanRole(user.role) === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, query, roleFilter]);

  const activeUsers = users.filter((user) => String(user.status || 'ACTIVE').toUpperCase() === 'ACTIVE');
  const lockedUsers = activeUsers.filter((user) => user.accountLocked && cleanRole(user.role) !== 'ADMIN');
  const staffCount = activeUsers.filter((user) => cleanRole(user.role) !== 'ADMIN').length;
  const adminCount = activeUsers.filter((user) => cleanRole(user.role) === 'ADMIN').length;

  useEffect(() => {
    loadData();
  }, []);

  async function syncCurrentSessionUser(nextUser) {
    if (!sessionUser || nextUser.id !== sessionUser.id) return;

    const updatedSessionUser = {
      ...sessionUser,
      id: nextUser.id,
      username: nextUser.username,
      name: nextUser.name,
      email: nextUser.email,
      doj: nextUser.doj,
      role: nextUser.role,
      accountLocked: Boolean(nextUser.accountLocked),
      status: nextUser.status || 'ACTIVE',
      lastLoginAt: nextUser.lastLoginAt || sessionUser.lastLoginAt || '',
    };

    setSessionUser(updatedSessionUser);
    await saveSession({ user: updatedSessionUser });
  }

  async function loadData() {
    setLoading(true);
    setError('');

    const [usersResult, historyResult] = await Promise.allSettled([
      getUsers(),
      getLoginHistory(),
    ]);

    const issues = [];

    if (usersResult.status === 'fulfilled') {
      setUsers((usersResult.value || []).map(normaliseUser));
    } else {
      setUsers([]);
      issues.push(usersResult.reason?.message || 'Could not load users.');
    }

    if (historyResult.status === 'fulfilled') {
      setHistory(historyResult.value || []);
    } else {
      setHistory([]);
      issues.push(historyResult.reason?.message || 'Could not load login activity.');
    }

    setError(issues.join(' '));
    setLoading(false);
  }

  function openCreate() {
    setModalUser(null);
    setModalOpen(true);
  }

  function openEdit(user) {
    setModalUser(user);
    setModalOpen(true);
  }

  async function submitUser(form, existingUser) {
    setSaving(true);

    try {
      const payload = {
        ...form,
        role: cleanRole(form.role),
      };

      if (!payload.password) delete payload.password;

      const savedUser = normaliseUser(
        existingUser
          ? await updateUser(existingUser.id, payload)
          : await createUser(payload)
      );

      setUsers((current) => (
        existingUser
          ? current.map((user) => (user.id === savedUser.id ? savedUser : user))
          : [savedUser, ...current]
      ));

      await syncCurrentSessionUser(savedUser);
      setModalOpen(false);
    } catch (saveError) {
      Alert.alert('Save failed', saveError.message || 'Could not save user.');
    } finally {
      setSaving(false);
    }
  }

  function deleteAccount(user) {
    Alert.alert('Delete User', `Delete ${user.name || user.username} permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteUser(user.id);
            setUsers((current) => current.filter((item) => item.id !== user.id));
          } catch (deleteError) {
            Alert.alert('Failed', deleteError.message || 'Failed to delete user.');
          }
        },
      },
    ]);
  }

  async function unlock(user) {
    try {
      const updatedUser = normaliseUser(await unlockUser(user.id));
      setUsers((current) => current.map((item) => (item.id === user.id ? updatedUser : item)));
      await syncCurrentSessionUser(updatedUser);
    } catch (unlockError) {
      Alert.alert('Failed', unlockError.message || 'Failed to unlock user.');
    }
  }

  return (
    <Screen scroll={false} style={{ paddingBottom: 0 }}>
      <TopBar title="Users" rightText="Home" onRight={() => go('dashboard')} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        <View style={styles.adminHeader}>
          <Text style={styles.kicker}>Admin Workspace</Text>

          <View style={styles.pageTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>User Management</Text>
              <Text style={styles.sub}>
                Manage staff accounts here. Admin accounts are view-only on this screen.
              </Text>
            </View>

          </View>
        </View>

        {!!error && <Text style={styles.warn}>{error}</Text>}

        <View style={styles.statsGrid}>
          <Stat label="Staff" value={staffCount} icon="people-outline" color={colors.emerald} />
          <Stat label="Admins" value={adminCount} icon="shield-outline" color={colors.purple} />
          <Stat label="Locked" value={lockedUsers.length} icon="lock-closed-outline" color={colors.danger} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          <TabButton title="Users" active={activeTab === 'users'} onPress={() => setActiveTab('users')} />
          <TabButton title="Security" active={activeTab === 'security'} onPress={() => setActiveTab('security')} badge={lockedUsers.length || ''} />
          <TabButton title="Suppliers" active={false} onPress={() => go('suppliers')} />
        </ScrollView>

        {activeTab === 'users' && (
          <View style={styles.sectionGap}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>User Accounts</Text>
                <Text style={styles.sectionSub}>{filteredUsers.length} users found</Text>
              </View>

              <Pressable style={styles.compactAddBtn} onPress={openCreate}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.compactAddText}>Add</Text>
              </Pressable>
            </View>

            <FormInput label="Search Users" icon="search-outline" value={query} onChangeText={setQuery} placeholder="Search by name, username, or email" />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {['ALL', 'ADMIN', 'STAFF'].map((role) => (
                <Pressable
                  key={role}
                  onPress={() => setRoleFilter(role)}
                  style={[styles.filterChip, roleFilter === role && styles.filterChipActive]}
                >
                  <Text style={[styles.filterText, roleFilter === role && styles.filterTextActive]}>
                    {role === 'ALL' ? 'All Roles' : role}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {filteredUsers.map((user) => (
              <UserCard key={user.id || user.username} user={user} onEdit={openEdit} onDelete={deleteAccount} onUnlock={unlock} />
            ))}
            {!filteredUsers.length && <Text style={styles.empty}>No users found.</Text>}
          </View>
        )}

        {activeTab === 'security' && (
          <View style={styles.sectionGap}>
            <Text style={styles.sectionTitle}>Locked Accounts</Text>
            {lockedUsers.length ? (
              lockedUsers.map((user) => (
                <UserCard key={user.id} user={user} onEdit={openEdit} onDelete={deleteAccount} onUnlock={unlock} />
              ))
            ) : (
              <Text style={styles.empty}>No locked non-admin users.</Text>
            )}

            <Text style={styles.sectionTitle}>Recent Login Activity</Text>
            {history.slice(0, 8).map((item, index) => (
              <Card key={item.id || index} style={styles.activityCard}>
                <View style={styles.activityTop}>
                  <Text style={styles.activityUser}>{item.username || item.email || 'Unknown user'}</Text>
                  <Text style={[styles.activityStatus, String(item.status || '').toUpperCase().includes('FAIL') ? { color: colors.danger } : { color: colors.emerald }]}>
                    {item.status || 'SUCCESS'}
                  </Text>
                </View>
                <Text style={styles.activityTime}>{item.loginTime || item.createdAt || '--'}</Text>
              </Card>
            ))}
            {!history.length && <Text style={styles.empty}>No login activity available.</Text>}
          </View>
        )}
      </ScrollView>

      <UserModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={submitUser}
        initialUser={modalUser}
        loading={saving}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  inputLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(15,23,42,0.45)' },
  dateFieldWrap: { height: 56, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.72)', justifyContent: 'center' },
  dateFieldWrapActive: { borderColor: colors.purple, backgroundColor: 'rgba(124,58,237,0.07)' },
  dateFieldIcon: { position: 'absolute', left: 16, zIndex: 1 },
  dateFieldText: { paddingHorizontal: 16, paddingLeft: 44, color: colors.slate, fontWeight: '800', fontSize: 14 },
  datePlaceholder: { color: 'rgba(15,23,42,0.32)' },
  calendarCard: { borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.78)', padding: 14, gap: 12 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarNavBtn: { width: 38, height: 38, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' },
  calendarNavBtnDisabled: { opacity: 0.55 },
  calendarTitle: { color: colors.slate, fontSize: 16, fontWeight: '900' },
  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: { flex: 1, textAlign: 'center', color: 'rgba(15,23,42,0.46)', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDayCell: { width: '14.2857%', aspectRatio: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.04)', borderWidth: 3, borderColor: 'transparent' },
  calendarDayEmpty: { backgroundColor: 'transparent' },
  calendarDayDisabled: { backgroundColor: 'rgba(15,23,42,0.03)' },
  calendarDaySelected: { backgroundColor: colors.purple },
  calendarDayText: { color: colors.slate, fontWeight: '800', fontSize: 13 },
  calendarDayTextDisabled: { color: 'rgba(15,23,42,0.22)' },
  calendarDayTextSelected: { color: '#fff' },
  calendarCloseBtn: { alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(15,23,42,0.06)' },
  calendarCloseText: { color: colors.slate, fontWeight: '900', fontSize: 12 },
  adminHeader: { marginTop: 4, marginBottom: 18 },
  kicker: { color: colors.emerald, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  title: { color: colors.slate, fontSize: 31, fontWeight: '900', letterSpacing: -1.2 },
  sub: { color: 'rgba(15,23,42,0.58)', fontWeight: '700', lineHeight: 22, marginTop: 8 },
  warn: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', color: '#92400E', padding: 12, borderRadius: 16, fontWeight: '800', marginBottom: 14 },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 12 },
  statIcon: { width: 36, height: 36, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { color: colors.slate, fontSize: 24, fontWeight: '900' },
  statLabel: { color: 'rgba(15,23,42,0.48)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  tabsRow: { gap: 10, paddingBottom: 16 },
  tabBtn: { paddingHorizontal: 16, height: 44, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.6)', flexDirection: 'row', alignItems: 'center', gap: 7 },
  tabBtnActive: { backgroundColor: colors.slate, borderColor: colors.slate },
  tabText: { color: 'rgba(15,23,42,0.55)', fontWeight: '900', fontSize: 12 },
  tabTextActive: { color: '#fff' },
  badge: { overflow: 'hidden', color: '#fff', backgroundColor: colors.danger, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, fontSize: 10, fontWeight: '900' },
  sectionGap: { gap: 12 },
  filterRow: { gap: 8, paddingVertical: 2 },
  filterChip: { paddingHorizontal: 13, height: 38, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { backgroundColor: colors.purple, borderColor: colors.purple },
  filterText: { color: colors.slate, fontWeight: '800', fontSize: 12 },
  filterTextActive: { color: '#fff' },
  userCard: { gap: 12, padding: 16, borderRadius: 26, marginBottom: 2 },
  userTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '900' },
  userName: { color: colors.slate, fontSize: 16, fontWeight: '900' },
  userMeta: { color: 'rgba(15,23,42,0.48)', fontSize: 12, fontWeight: '700', marginTop: 3, lineHeight: 18 },
  tagsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: { overflow: 'hidden', color: 'rgba(15,23,42,0.62)', backgroundColor: 'rgba(15,23,42,0.06)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontWeight: '900', fontSize: 11 },
  actionRow: { flexDirection: 'row', gap: 8 },
  smallBtn: { flex: 1, height: 40, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  smallBtnDisabled: { opacity: 0.75 },
  smallBtnText: { color: colors.slate, fontWeight: '900', fontSize: 12 },
  empty: { color: 'rgba(15,23,42,0.5)', fontWeight: '800', textAlign: 'center', paddingVertical: 18 },
  sectionTitle: { color: colors.slate, fontSize: 20, fontWeight: '900', marginTop: 4 },
  activityCard: { padding: 14, borderRadius: 24 },
  activityTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  activityUser: { color: colors.slate, fontWeight: '900', flex: 1 },
  activityStatus: { fontWeight: '900', fontSize: 11 },
  activityTime: { color: 'rgba(15,23,42,0.46)', fontWeight: '700', marginTop: 6, fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '88%', backgroundColor: colors.background, borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: 20 },
  modalTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle: { color: colors.slate, fontSize: 23, fontWeight: '900' },
  closeBtn: { width: 42, height: 42, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  error: { backgroundColor: '#FEF2F2', color: colors.danger, borderWidth: 1, borderColor: '#FECACA', padding: 12, borderRadius: 16, textAlign: 'center', fontWeight: '800' },
  smallLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(15,23,42,0.45)', marginBottom: 8 },
  roleWrap: { gap: 4 },
  roleGrid: { gap: 8 },
  roleOption: { padding: 13, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.68)' },
  roleOptionActive: { backgroundColor: colors.purple, borderColor: colors.purple },
  roleOptionText: { color: colors.slate, fontWeight: '900' },
  roleOptionTextActive: { color: '#fff' },
  pageTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, marginBottom: 2 },
  sectionSub: { color: 'rgba(15,23,42,0.46)', fontSize: 12, fontWeight: '800', marginTop: 3 },
  compactAddBtn: { height: 42, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.slate, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  compactAddText: { color: '#fff', fontSize: 12, fontWeight: '900' },
});
