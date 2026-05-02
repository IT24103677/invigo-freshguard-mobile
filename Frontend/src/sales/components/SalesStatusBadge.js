import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { salesColors } from '../theme';

const VARIANTS = {
  critical: { bg: salesColors.tertiaryContainer, text: salesColors.onTertiaryContainer, label: 'Critical' },
  active: { bg: '#e7f3eb', text: salesColors.success, label: 'Active' },
  void: { bg: '#fde9e4', text: salesColors.terracotta, label: 'Void' },
  'in-stock': { bg: salesColors.primary, text: salesColors.white, label: 'In Stock' },
  'low-stock': { bg: salesColors.terracotta, text: salesColors.white, label: 'Low Stock' },
  expired: { bg: salesColors.tertiaryContainer, text: salesColors.onTertiaryContainer, label: 'Expired' },
  'expires-soon': { bg: salesColors.secondaryContainer, text: salesColors.onSecondaryContainer, label: 'Expires Soon' },
  stable: { bg: salesColors.surfaceHighest, text: salesColors.textMuted, label: 'Stable' },
};

export default function SalesStatusBadge({ variant, label }) {
  const config = VARIANTS[variant] || VARIANTS.stable;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.label, { color: config.text }]}>
        {label || config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
