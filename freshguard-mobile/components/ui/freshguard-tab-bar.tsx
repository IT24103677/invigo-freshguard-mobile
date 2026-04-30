import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";

export type TabRoute = "dashboard" | "index" | "explore" | "reports";

interface TabItem {
  name: TabRoute;
  label: string;
  icon: string;
  iconFocused: string;
}

const TABS: TabItem[] = [
  {
    name: "dashboard",
    label: "Dashboard",
    icon: "view-dashboard-outline",
    iconFocused: "view-dashboard",
  },
  {
    name: "index",
    label: "POS",
    icon: "cash-register",
    iconFocused: "cash-register",
  },
  {
    name: "explore",
    label: "Sales",
    icon: "receipt-text-outline",
    iconFocused: "receipt-text",
  },
  {
    name: "reports",
    label: "Reports",
    icon: "chart-bar",
    iconFocused: "chart-bar",
  },
];

interface FreshguardTabBarProps {
  activeTab: TabRoute;
  onNavigate: (tab: TabRoute) => void;
  onScannerPress?: () => void;
}

export function FreshguardTabBar({
  activeTab,
  onNavigate,
  onScannerPress,
}: FreshguardTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <>
      {/* FAB — barcode scanner */}
      <View style={styles.fabContainer} pointerEvents="box-none">
        <Pressable
          onPress={onScannerPress}
          style={({ pressed }) => [
            styles.fab,
            pressed && styles.fabPressed,
          ]}
        >
          <MaterialCommunityIcons
            name="barcode-scan"
            size={26}
            color={colors.white}
          />
        </Pressable>
      </View>

      {/* Bottom navigation bar */}
      <View
        style={[
          styles.bar,
          {
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.name;
          return (
            <Pressable
              key={tab.name}
              onPress={() => onNavigate(tab.name)}
              style={styles.tabBtn}
            >
              <View
                style={[
                  styles.tabInner,
                  isActive && styles.tabInnerActive,
                ]}
              >
                <MaterialCommunityIcons
                  name={(isActive ? tab.iconFocused : tab.icon) as any}
                  size={22}
                  color={isActive ? colors.primary : colors.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: "absolute",
    right: 24,
    bottom: 96,
    zIndex: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  bar: {
    flexDirection: "row",
    backgroundColor: colors.surfaceHigh + "f2", // 95% opacity
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + "50",
    paddingTop: 10,
    paddingHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
      },
      android: { elevation: 8 },
    }),
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabInner: {
    width: 44,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  tabInnerActive: {
    backgroundColor: colors.primaryContainer + "55",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  tabLabelActive: {
    color: colors.primary,
  },
  tabLabelInactive: {
    color: colors.textMuted,
    opacity: 0.7,
  },
});
