import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';

export const SALES_BOTTOM_NAV_HEIGHT = 108;

const ITEMS = [
  { key: 'salesPos', label: 'POS', type: 'material', icon: 'cart-outline' },
  { key: 'salesHistory', label: 'Sales', type: 'material', icon: 'receipt-text-outline' },
  { key: 'salesReports', label: 'Reports', type: 'material', icon: 'chart-bar' },
];

function NavIcon({ item, active }) {
  const iconColor = active ? '#fff' : 'rgba(15,23,42,0.42)';

  if (item.type === 'ion') {
    return <Ionicons name={item.icon} size={20} color={iconColor} />;
  }

  return <MaterialCommunityIcons name={item.icon} size={20} color={iconColor} />;
}

export default function SalesBottomNav({ state, navigation }) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.nav}>
        {ITEMS.map((item) => {
          const routeIndex = state.routes.findIndex((route) => route.name === item.key);
          const isActive = state.index === routeIndex;

          return (
            <Pressable
              key={item.key}
              style={styles.item}
              onPress={() => routeIndex >= 0 && navigation.navigate(item.key)}
            >
              <View style={[styles.iconWrap, isActive && styles.activeIconWrap]}>
                <NavIcon item={item} active={isActive} />
              </View>
              <Text style={[styles.label, isActive && styles.activeLabel]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 10,
    backgroundColor: 'rgba(248,250,252,0.70)',
  },
  nav: {
    height: 82,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconWrap: {
    backgroundColor: colors.purple,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '900',
    color: 'rgba(15,23,42,0.42)',
  },
  activeLabel: {
    color: colors.purple,
  },
});
