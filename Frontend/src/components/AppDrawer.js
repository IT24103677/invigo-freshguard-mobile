import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const ADMIN_ITEMS = [
  { key: 'dashboard',    label: 'Home',            icon: 'home-outline',       color: colors.slate },
  { key: 'products',     label: 'Products',         icon: 'cube-outline',       color: colors.purple },
  { key: 'batches',      label: 'Batch Management', icon: 'archive-outline',    color: colors.emerald },
  { key: 'suppliers',    label: 'Suppliers',        icon: 'business-outline',   color: colors.magenta },
  { key: 'salesPos',     label: 'POS',              icon: 'cart-outline',       color: colors.emerald },
  { key: 'salesHistory', label: 'Sales History',    icon: 'receipt-outline',    color: colors.purple },
  { key: 'salesReports', label: 'Reports',          icon: 'bar-chart-outline',  color: colors.magenta },
  { key: 'adminUsers',   label: 'User Management',  icon: 'people-outline',     color: colors.slate },
  { key: 'discounts',   label: 'Discounts',        icon: 'pricetag-outline',   color: colors.purple },
];

const STAFF_ITEMS = [
  { key: 'dashboard',    label: 'Home',          icon: 'home-outline',      color: colors.slate },
  { key: 'salesPos',     label: 'POS',           icon: 'cart-outline',      color: colors.emerald },
  { key: 'salesHistory', label: 'Sales History', icon: 'receipt-outline',   color: colors.purple },
  { key: 'salesReports', label: 'Reports',       icon: 'bar-chart-outline', color: colors.magenta },
  { key: 'discounts',   label: 'Discounts',     icon: 'pricetag-outline',  color: colors.purple },
  { key: 'profile',      label: 'My Profile',    icon: 'person-outline',    color: colors.slate },
];

export default function AppDrawer({ visible, onClose, go, role, sessionUser, onLogout }) {
  const slideAnim = useRef(new Animated.Value(-320)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const isAdmin = String(role || '').toUpperCase() === 'ADMIN';
  const items = isAdmin ? ADMIN_ITEMS : STAFF_ITEMS;
  const name = sessionUser?.name || sessionUser?.username || 'User';

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 68, friction: 11 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -320, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 0,    duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  function navigate(key) {
    onClose();
    setTimeout(() => go(key), 180);
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.panel, { transform: [{ translateX: slideAnim }] }]}>
          <View style={styles.userRow}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{String(name).slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>{name}</Text>
              <Text style={styles.userRole}>{isAdmin ? 'Administrator' : 'Staff'}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <Ionicons name="close" size={20} color={colors.slate} />
            </Pressable>
          </View>

          <View style={styles.divider} />

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {items.map((item) => (
              <Pressable key={item.key} style={styles.item} onPress={() => navigate(item.key)}>
                <View style={[styles.itemIcon, { backgroundColor: `${item.color}18` }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <Text style={styles.itemLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="rgba(15,23,42,0.25)" />
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.divider} />

          <Pressable style={styles.logoutRow} onPress={() => { onClose(); onLogout(); }}>
            <View style={[styles.itemIcon, { backgroundColor: 'rgba(239,68,68,0.10)' }]}>
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            </View>
            <Text style={styles.logoutLabel}>Logout</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  panel: {
    width: 290,
    height: '100%',
    backgroundColor: '#F4F7F0',
    paddingTop: 58,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  userAvatar: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
  userName: {
    color: colors.slate,
    fontWeight: '900',
    fontSize: 15,
  },
  userRole: {
    color: colors.purple,
    fontWeight: '800',
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(15,23,42,0.08)',
    marginHorizontal: 20,
    marginVertical: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    flex: 1,
    color: colors.slate,
    fontWeight: '800',
    fontSize: 14,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  logoutLabel: {
    flex: 1,
    color: colors.danger,
    fontWeight: '900',
    fontSize: 14,
  },
});
