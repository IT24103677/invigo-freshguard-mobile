import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { getCurrentUser, logoutUser } from "@/src/api/auth";
import { useAuthSession } from "@/src/context/auth-session";
import { AuthUser } from "@/src/types/auth";
import { colors } from "@/src/theme/colors";
import { BrandMark } from "@/components/ui/brand-mark";

export default function DashboardScreen() {
  const { setIsAuthenticated } = useAuthSession();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch {
        setCurrentUser(null);
      }
    };

    loadCurrentUser();
  }, []);

  const handleLogout = () => {
    Alert.alert("Log Out", "Do you want to end your current session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            await logoutUser();
            setIsAuthenticated(false);
            router.replace("/login");
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BrandMark size={26} />
          <Text style={styles.appTitle}>Invigo FreshGuard</Text>
        </View>

        <Pressable
          onPress={handleLogout}
          disabled={isLoggingOut}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
            isLoggingOut && styles.logoutButtonDisabled,
          ]}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color={colors.terracotta} />
          ) : (
            <>
              <MaterialCommunityIcons
                name="logout-variant"
                size={16}
                color={colors.terracotta}
              />
              <Text style={styles.logoutText}>Log Out</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            name="view-dashboard-outline"
            size={64}
            color={colors.primarySoft}
          />
        </View>
        <Text style={styles.eyebrow}>Module Under Construction</Text>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>
          Real-time KPIs, freshness scores, and daily waste metrics will appear
          here in a future release.
        </Text>

        <View style={styles.sessionCard}>
          <Text style={styles.sessionLabel}>Current Session</Text>
          <Text style={styles.sessionValue}>
            {currentUser?.name ?? "Authenticated User"}
          </Text>
          <Text style={styles.sessionMeta}>
            {currentUser?.email ?? "User email unavailable"}
          </Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {currentUser?.role ?? "SIGNED IN"}
            </Text>
          </View>
        </View>

        <View style={styles.tagRow}>
          {["Sales Today", "Waste Rate", "Stock Health", "AI Alerts"].map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagLabel}>{t}</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface + "cc",
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + "50",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.terracottaSoft + "80",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.terracottaSoft,
  },
  logoutButtonPressed: {
    opacity: 0.85,
  },
  logoutButtonDisabled: {
    opacity: 0.7,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.terracotta,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
    paddingBottom: 80,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryFixed,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.primary,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "center",
  },
  sessionCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: "center",
    gap: 6,
  },
  sessionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.primary,
  },
  sessionValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  sessionMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  roleBadge: {
    marginTop: 4,
    backgroundColor: colors.primaryContainer,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.onPrimaryContainer,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 8,
  },
  tag: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  tagLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
});
