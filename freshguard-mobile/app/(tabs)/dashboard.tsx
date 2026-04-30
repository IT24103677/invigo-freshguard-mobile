import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import { getCurrentUser, logoutUser } from "@/src/api/auth";
import { getDashboardSummary } from "@/src/api/dashboard";
import { useAuthSession } from "@/src/context/auth-session";
import { AuthUser } from "@/src/types/auth";
import { colors } from "@/src/theme/colors";
import { BrandMark } from "@/components/ui/brand-mark";

function formatMoney(amount: number) {
  return `Rs. ${amount.toFixed(2)}`;
}

export default function DashboardScreen() {
  const { setIsAuthenticated } = useAuthSession();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [todaysRevenue, setTodaysRevenue] = useState(0);
  const [todaysActiveBills, setTodaysActiveBills] = useState(0);
  const [todaysUnitsSold, setTodaysUnitsSold] = useState(0);
  const [voidedSalesCount, setVoidedSalesCount] = useState(0);
  const [latestSaleId, setLatestSaleId] = useState<string | null>(null);
  const [latestSaleGroupId, setLatestSaleGroupId] = useState("");
  const [latestSaleAmount, setLatestSaleAmount] = useState(0);
  const [latestSaleTime, setLatestSaleTime] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [user, summary] = await Promise.all([
        getCurrentUser(),
        getDashboardSummary(),
      ]);

      setCurrentUser(user);
      setTodaysRevenue(summary.todaysRevenue);
      setTodaysActiveBills(summary.todaysActiveBills);
      setTodaysUnitsSold(summary.todaysUnitsSold);
      setVoidedSalesCount(summary.voidedSalesCount);
      setLatestSaleId(summary.latestActiveSale?._id ?? null);
      setLatestSaleGroupId(summary.latestActiveSale?.saleGroupId ?? "");
      setLatestSaleAmount(summary.latestActiveSale?.grandTotal ?? 0);
      setLatestSaleTime(summary.latestActiveSale?.saleDateTime ?? "");
    } catch {
      setCurrentUser(null);
      setErrorMessage("Failed to load live sales dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

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

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard summary...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroLeft}>
              <Text style={styles.eyebrow}>Live Sales Summary</Text>
              <Text style={styles.title}>Dashboard</Text>
              <Text style={styles.subtitle}>
                Operational totals are driven by ACTIVE sales only, while VOID
                sales remain visible for audit.
              </Text>
            </View>
            <View style={styles.heroBadge}>
              <MaterialCommunityIcons
                name="finance"
                size={28}
                color={colors.primary}
              />
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Pressable onPress={loadDashboard} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.metricsGrid}>
                <View style={[styles.metricCard, styles.metricCardPrimary]}>
                  <Text style={styles.metricLabel}>Today&apos;s Revenue</Text>
                  <Text style={styles.metricValue}>
                    {formatMoney(todaysRevenue)}
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Bills Today</Text>
                  <Text style={styles.metricValueNumber}>
                    {todaysActiveBills}
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Units Sold Today</Text>
                  <Text style={styles.metricValueNumber}>
                    {todaysUnitsSold}
                  </Text>
                </View>

                <View style={[styles.metricCard, styles.metricCardAlert]}>
                  <Text style={[styles.metricLabel, styles.metricLabelAlert]}>
                    Voided Sales
                  </Text>
                  <Text style={[styles.metricValueNumber, styles.metricValueAlert]}>
                    {voidedSalesCount}
                  </Text>
                </View>
              </View>

              <View style={styles.latestCard}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Latest Active Sale</Text>
                  <Pressable onPress={() => router.push("/explore")}>
                    <Text style={styles.linkText}>View Sales</Text>
                  </Pressable>
                </View>

                {latestSaleId ? (
                  <>
                    <Text style={styles.latestId}>{latestSaleGroupId}</Text>
                    <Text style={styles.latestAmount}>
                      {formatMoney(latestSaleAmount)}
                    </Text>
                    <Text style={styles.latestMeta}>
                      Recorded on {new Date(latestSaleTime).toLocaleString()}
                    </Text>
                    <Pressable
                      onPress={() => router.push(`/sales/${latestSaleId}`)}
                      style={styles.latestAction}
                    >
                      <Text style={styles.latestActionText}>Open Sale Details</Text>
                      <MaterialCommunityIcons
                        name="arrow-right"
                        size={16}
                        color={colors.onPrimaryContainer}
                      />
                    </Pressable>
                  </>
                ) : (
                  <Text style={styles.emptyText}>
                    No active sales have been recorded yet.
                  </Text>
                )}
              </View>
            </>
          )}

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
        </ScrollView>
      )}
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textMuted,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 100,
    gap: 16,
  },
  heroCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.outlineVariant + "60",
  },
  heroLeft: {
    flex: 1,
    gap: 4,
  },
  heroBadge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.primaryFixed,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  errorCard: {
    backgroundColor: colors.errorContainer,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.error,
    fontWeight: "600",
  },
  retryBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.error,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    width: "48%",
    minHeight: 128,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant + "60",
    justifyContent: "space-between",
  },
  metricCardPrimary: {
    backgroundColor: colors.primaryFixed,
  },
  metricCardAlert: {
    backgroundColor: colors.terracottaSoft + "55",
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  metricLabelAlert: {
    color: colors.terracotta,
  },
  metricValue: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: colors.primary,
  },
  metricValueNumber: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    color: colors.text,
  },
  metricValueAlert: {
    color: colors.terracotta,
  },
  latestCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.outlineVariant + "60",
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  latestId: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primary,
  },
  latestAmount: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
  },
  latestMeta: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  latestAction: {
    marginTop: 6,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.primaryContainer,
  },
  latestActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onPrimaryContainer,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
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
});
