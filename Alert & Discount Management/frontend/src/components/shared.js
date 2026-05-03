import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { shared, colors, LEVEL_CONFIG } from "../constants/styles";

// ─── StatCard ─────────────────────────────────────────────────────────────────
export const StatCard = ({ label, value, accent }) => (
  <View style={[shared.card, { borderTopWidth: 3, borderTopColor: accent, flex: 1, minWidth: 80, alignItems: "center", paddingVertical: 16 }]}>
    <Text style={{ fontSize: 22, fontWeight: "900", color: accent }}>{value}</Text>
    <Text style={[shared.micro, { color: colors.inkLight, textAlign: "center", marginTop: 4 }]}>{label}</Text>
  </View>
);

// ─── Pill ─────────────────────────────────────────────────────────────────────
export const Pill = ({ label, backgroundColor, color }) => (
  <View style={[shared.pill, { backgroundColor }]}>
    <Text style={[shared.pillText, { color }]}>{label}</Text>
  </View>
);

// ─── AlertLevelBadge ──────────────────────────────────────────────────────────
export const AlertLevelBadge = ({ level }) => {
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.LOW;
  return (
    <View style={[shared.pill, { backgroundColor: cfg.bg, borderWidth: 1, borderColor: cfg.border }]}>
      <Text style={[shared.pillText, { color: cfg.color }]}>{cfg.icon} {cfg.label}</Text>
    </View>
  );
};

// ─── Banner ───────────────────────────────────────────────────────────────────
export const Banner = ({ type = "error", message, onClose }) => {
  if (!message) return null;
  const isError = type === "error";
  return (
    <View style={[shared.banner, isError ? shared.bannerError : shared.bannerSuccess]}>
      <Text style={[shared.bannerText, isError ? shared.bannerErrorText : shared.bannerSuccessText]}>
        {isError ? "⚠ " : "✓ "}{message}
      </Text>
      {onClose && (
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: isError ? colors.critical : colors.success }}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── ToggleSwitch ─────────────────────────────────────────────────────────────
export const ToggleSwitch = ({ checked, onToggle, disabled }) => {
  const bg = checked ? colors.successBg : colors.inkFaint;
  const thumbColor = checked ? colors.success : "#9CA3AF";
  const label = checked ? "Active" : "Inactive";
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onToggle}
      style={[styles.toggleBtn, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }]}
      accessibilityRole="switch"
      accessibilityState={{ checked }}
    >
      <View style={[styles.toggleThumb, { backgroundColor: thumbColor }]} />
      <Text style={[shared.micro, { color: thumbColor, marginLeft: 6 }]}>{label}</Text>
    </TouchableOpacity>
  );
};

// ─── EmptyState ───────────────────────────────────────────────────────────────
export const EmptyState = ({ icon = "🏷️", text }) => (
  <View style={shared.emptyState}>
    <Text style={shared.emptyIcon}>{icon}</Text>
    <Text style={shared.emptyText}>{text}</Text>
  </View>
);

// ─── Spinner ──────────────────────────────────────────────────────────────────
export const Spinner = ({ label = "Loading…" }) => (
  <View style={{ alignItems: "center", paddingVertical: 32, gap: 10 }}>
    <ActivityIndicator size="large" color={colors.primary} />
    <Text style={[shared.micro, { color: colors.inkLight }]}>{label}</Text>
  </View>
);

// ─── SectionHeader ────────────────────────────────────────────────────────────
export const SectionHeader = ({ title, subtitle }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={shared.sectionTitle}>{title}</Text>
    {subtitle ? <Text style={[shared.micro, { color: colors.inkLight, marginTop: 2 }]}>{subtitle}</Text> : null}
  </View>
);

// ─── FilterTabs ───────────────────────────────────────────────────────────────
export const FilterTabs = ({ options, active, onSelect }) => (
  <View style={styles.tabsRow}>
    {options.map((opt) => {
      const isActive = active === opt.value;
      return (
        <TouchableOpacity
          key={opt.value}
          onPress={() => onSelect(opt.value)}
          style={[styles.tab, isActive && styles.tabActive]}
        >
          <Text style={[shared.micro, { color: isActive ? "#fff" : colors.inkLight }]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  toggleThumb: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tabsRow: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderInk,
    overflow: "hidden",
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
});
