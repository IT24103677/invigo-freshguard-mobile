import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppDrawer from './AppDrawer';
import Logo from './Logo';
import { colors } from '../theme';

export default function WorkspaceHeader({
  pillLabel = '',
  pillIcon = 'apps-outline',
  pillColor = colors.purple,
  onLogout,
  onBack = null,
  go = null,
  role = 'STAFF',
  sessionUser = null,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <View style={styles.wrap}>
        <View style={styles.header}>
          {go ? (
            <Pressable style={styles.menuBtn} onPress={() => setDrawerOpen(true)} hitSlop={10}>
              <Ionicons name="menu-outline" size={24} color={colors.slate} />
            </Pressable>
          ) : (
            <Logo size={38} textSize={28} />
          )}

          <View style={styles.headerRight}>
            {onLogout ? (
              <Pressable style={styles.logoutButton} onPress={onLogout} hitSlop={10}>
                <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {(pillLabel || onBack) ? (
          <View style={styles.metaRow}>
            {onBack ? (
              <Pressable style={styles.backButton} onPress={onBack} hitSlop={10}>
                <Ionicons name="chevron-back" size={18} color={colors.slate} />
              </Pressable>
            ) : null}

            {!!pillLabel && (
              <View style={styles.pill}>
                <Ionicons name={pillIcon} size={15} color={pillColor} />
                <Text style={[styles.pillText, { color: pillColor }]}>{pillLabel}</Text>
              </View>
            )}
          </View>
        ) : null}
      </View>

      {go && (
        <AppDrawer
          visible={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          go={go}
          role={role}
          sessionUser={sessionUser}
          onLogout={onLogout}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuBtn: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 94,
    justifyContent: 'center',
  },
  logoutText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pill: {
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
  },
  pillText: {
    fontSize: 12,
    fontWeight: '900',
  },
});
