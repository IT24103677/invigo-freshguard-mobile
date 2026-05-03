import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Logo from './Logo';
import { colors } from '../theme';

export default function SalesWorkspaceHeader({
  title = '',
  showLogo = false,
  onBack = null,
  menuItems = [],
  actionLabel = '',
  actionIcon = 'log-out-outline',
  actionColor = colors.danger,
  actionLoading = false,
  actionDisabled = false,
  onAction = null,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hasMenu = Array.isArray(menuItems) && menuItems.length > 0;

  const resolvedMenuItems = useMemo(
    () => menuItems.filter((item) => item && typeof item.onPress === 'function'),
    [menuItems]
  );

  function handleMenuItemPress(item) {
    setMenuOpen(false);
    item.onPress();
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.left}>
          {onBack ? (
            <>
              <Pressable style={styles.backButton} onPress={onBack} hitSlop={10}>
                <Ionicons name="chevron-back" size={20} color={colors.slate} />
              </Pressable>
              <Text style={styles.title}>{title}</Text>
            </>
          ) : showLogo ? (
            <Logo size={36} textSize={24} />
          ) : (
            <Text style={styles.title}>{title}</Text>
          )}
        </View>

        {hasMenu ? (
          <Pressable
            style={styles.menuButton}
            onPress={() => setMenuOpen((current) => !current)}
            hitSlop={10}
          >
            <Ionicons name={menuOpen ? 'close-outline' : 'menu-outline'} size={20} color={colors.slate} />
          </Pressable>
        ) : onAction ? (
          <Pressable
            style={styles.actionButton}
            onPress={onAction}
            disabled={actionDisabled || actionLoading}
            hitSlop={10}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={actionColor} />
            ) : (
              <>
                <Ionicons name={actionIcon} size={17} color={actionColor} />
                <Text style={[styles.actionText, { color: actionColor }]}>{actionLabel}</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </View>

      {hasMenu && menuOpen ? (
        <View style={styles.menuCard}>
          {resolvedMenuItems.map((item) => (
            <Pressable
              key={item.key || item.label}
              style={[styles.menuItem, item.active && styles.menuItemActive]}
              onPress={() => handleMenuItemPress(item)}
            >
              <Ionicons
                name={item.icon || 'ellipse-outline'}
                size={18}
                color={item.danger ? colors.danger : (item.active ? colors.purple : colors.slate)}
              />
              <Text
                style={[
                  styles.menuItemText,
                  item.active && styles.menuItemTextActive,
                  item.danger && { color: colors.danger },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    zIndex: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  left: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.slate,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 102,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '900',
  },
  menuCard: {
    marginTop: 10,
    alignSelf: 'flex-end',
    minWidth: 186,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  menuItemActive: {
    backgroundColor: 'rgba(124,58,237,0.10)',
  },
  menuItemText: {
    color: colors.slate,
    fontSize: 13,
    fontWeight: '800',
  },
  menuItemTextActive: {
    color: colors.purple,
  },
});
