import React, { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Logo from './src/components/Logo';
import InventoryScreen from './src/screens/InventoryScreen';
import PlaceholderScreen from './src/screens/PlaceholderScreen';
import { colors } from './src/theme';

const {
  getNavItems,
  getHeaderTitle,
  isWorkingModule,
} = require('./src/navigation/helpers.cjs');

function Sidebar({ items, activeKey, onSelect, compact }) {
  if (compact) {
    return (
      <View style={styles.mobileSidebar}>
        <View style={styles.mobileTop}>
          <Logo size={44} textSize={24} light />
          <View style={styles.mobileAvatar}>
            <Text style={styles.userAvatarText}>ST</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mobileNavRow}
        >
          {items.map((item) => {
            const active = item.key === activeKey;
            return (
              <Pressable
                key={item.key}
                onPress={() => onSelect(item.key)}
                style={[styles.mobileNavChip, active && styles.mobileNavChipActive]}
              >
                <Ionicons name={item.icon} size={18} color={active ? '#00B084' : colors.shellText} />
                <Text style={[styles.mobileNavText, active && styles.mobileNavTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.sidebar}>
      <Logo size={56} textSize={28} light />

      <View style={styles.userCard}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>ST</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userTitle}>Staff Hub</Text>
          <Text style={styles.userSub}>Status: Active</Text>
        </View>
      </View>

      <View style={styles.navList}>
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item.key)}
              style={[styles.navItem, active && styles.navItemActive]}
            >
              <Ionicons name={item.icon} size={24} color={active ? '#00B084' : colors.shellText} />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
              {active && <View style={styles.navDot} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Header({ title }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerRight}>
        <View style={styles.shiftPill}>
          <Ionicons name="time-outline" size={18} color={colors.emerald} />
          <Text style={styles.shiftText}>SHIFT: 08:00 - 16:00</Text>
        </View>
        <View style={styles.settingsPill}>
          <Ionicons name="settings-outline" size={20} color={colors.slate} />
        </View>
      </View>
    </View>
  );
}

export default function App() {
  const { width } = useWindowDimensions();
  const [activeKey, setActiveKey] = useState('inventory');
  const items = useMemo(() => getNavItems(), []);
  const compact = width < 980;

  const activeItem = items.find((item) => item.key === activeKey) || items[3];
  const isInventory = isWorkingModule(activeKey);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.shell} />
      <View style={[styles.root, compact && styles.rootCompact]}>
        <Sidebar items={items} activeKey={activeKey} onSelect={setActiveKey} compact={compact} />

        <View style={styles.main}>
          <Header title={getHeaderTitle(activeKey)} />

          <View style={styles.contentShell}>
            <View style={[styles.glow, styles.glowLeft]} />
            <View style={[styles.glow, styles.glowRight]} />
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.contentScroll}
              showsVerticalScrollIndicator={false}
            >
              {isInventory ? (
                <InventoryScreen />
              ) : (
                <PlaceholderScreen title={activeItem.title} label={activeItem.label} />
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.shell,
  },
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.shell,
  },
  rootCompact: {
    flexDirection: 'column',
  },
  sidebar: {
    width: 348,
    backgroundColor: colors.shell,
    paddingHorizontal: 22,
    paddingTop: 34,
    paddingBottom: 28,
  },
  userCard: {
    marginTop: 38,
    borderRadius: 28,
    backgroundColor: '#CDD3DB',
    paddingHorizontal: 14,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: '#5C44D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
  },
  userTitle: {
    color: colors.slate,
    fontWeight: '900',
    fontSize: 16,
  },
  userSub: {
    marginTop: 3,
    color: '#6F7686',
    textTransform: 'uppercase',
    fontWeight: '900',
    letterSpacing: 1.3,
    fontSize: 11,
  },
  navList: {
    marginTop: 42,
    gap: 12,
  },
  navItem: {
    minHeight: 62,
    paddingHorizontal: 18,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  navItemActive: {
    backgroundColor: colors.shellActive,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  navLabel: {
    color: colors.shellText,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  navLabelActive: {
    color: '#fff',
    fontWeight: '900',
  },
  navDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00B084',
  },
  mobileNavRow: {
    paddingVertical: 12,
    gap: 10,
  },
  mobileSidebar: {
    backgroundColor: colors.shell,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 10,
  },
  mobileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mobileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: '#5C44D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileNavChip: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.shellActive,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileNavChipActive: {
    backgroundColor: '#24324B',
  },
  mobileNavText: {
    color: colors.shellText,
    fontWeight: '800',
    fontSize: 13,
  },
  mobileNavTextActive: {
    color: '#fff',
  },
  main: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    minHeight: 94,
    backgroundColor: colors.white,
    paddingHorizontal: 28,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(24,35,58,0.04)',
    gap: 16,
  },
  headerTitle: {
    color: colors.slate,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shiftPill: {
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: '#FBFBFB',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shiftText: {
    color: '#6F7686',
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  settingsPill: {
    width: 50,
    height: 50,
    borderRadius: 22,
    backgroundColor: '#FBFBFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentShell: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  contentScroll: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 42,
  },
  glow: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: colors.contentGlow,
  },
  glowLeft: {
    left: -110,
    top: 90,
  },
  glowRight: {
    right: -80,
    top: 220,
  },
});
