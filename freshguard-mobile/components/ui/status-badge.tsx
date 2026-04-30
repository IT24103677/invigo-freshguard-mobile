import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/src/theme/colors";

type StatusVariant =
  | "critical"
  | "urgent"
  | "fresh"
  | "watchlist"
  | "active"
  | "void"
  | "optimal"
  | "depleted"
  | "in-stock"
  | "low-stock"
  | "expired"
  | "expires-soon"
  | "stable";

interface StatusBadgeProps {
  variant: StatusVariant;
  label?: string;
}

const variantConfig: Record<
  StatusVariant,
  { bg: string; text: string; label: string }
> = {
  critical: {
    bg: colors.tertiaryContainer,
    text: colors.onTertiaryContainer,
    label: "Critical",
  },
  urgent: {
    bg: colors.surfaceHighest,
    text: colors.textMuted,
    label: "Urgent",
  },
  fresh: {
    bg: colors.primaryContainer,
    text: colors.onPrimaryContainer,
    label: "Fresh",
  },
  watchlist: {
    bg: colors.secondaryContainer,
    text: colors.onSecondaryContainer,
    label: "Watchlist",
  },
  active: {
    bg: "#e7f3eb",
    text: colors.success,
    label: "Active",
  },
  void: {
    bg: "#fde9e4",
    text: colors.terracotta,
    label: "Void",
  },
  optimal: {
    bg: colors.primaryContainer,
    text: colors.onPrimaryContainer,
    label: "Optimal",
  },
  depleted: {
    bg: colors.surfaceHighest,
    text: colors.textMuted,
    label: "Depleted",
  },
  "in-stock": {
    bg: colors.primary,
    text: colors.onPrimary,
    label: "In Stock",
  },
  "low-stock": {
    bg: colors.terracotta,
    text: colors.onPrimary,
    label: "Low Stock",
  },
  expired: {
    bg: colors.tertiaryContainer,
    text: colors.onTertiaryContainer,
    label: "Expired",
  },
  "expires-soon": {
    bg: colors.secondaryContainer,
    text: colors.onSecondaryContainer,
    label: "Expires Soon",
  },
  stable: {
    bg: colors.surfaceHighest,
    text: colors.textMuted,
    label: "Stable",
  },
};

export function StatusBadge({ variant, label }: StatusBadgeProps) {
  const config = variantConfig[variant];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.label, { color: config.text }]}>
        {label ?? config.label}
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
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
