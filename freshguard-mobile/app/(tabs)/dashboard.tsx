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

type DashboardRange = "TODAY" | "THIS_WEEK" | "THIS_MONTH";

function getDashboardRangeParams(range: DashboardRange): {
  from?: string;
  to?: string;
} {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (range === "THIS_WEEK") {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
  }

  if (range === "THIS_MONTH") {
    start.setDate(1);
  }

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

function getRangeLabel(range: DashboardRange) {
  if (range === "THIS_WEEK") {
    return "This Week";
  }

  if (range === "THIS_MONTH") {
    return "This Month";
  }

  return "Today";
}

function getRangeEmptyMessage(range: DashboardRange) {
  if (range === "THIS_WEEK") {
    return "No active sales have been recorded yet this week.";
  }

  if (range === "THIS_MONTH") {
    return "No active sales have been recorded yet this month.";
  }

  return "No active sales have been recorded yet today.";
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
  const [selectedRange, setSelectedRange] = useState<DashboardRange>("TODAY");
  const hasActiveSales = todaysActiveBills > 0;
  const emptyRangeMessage = getRangeEmptyMessage(selectedRange);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [user, summary] = await Promise.all([
        getCurrentUser(),
        getDashboardSummary(getDashboardRangeParams(selectedRange)),
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
  }, [selectedRange]);

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

  const openSalesWithPreset = (preset?: {
    range?: DashboardRange;
    status?: "ALL" | "ACTIVE" | "VOID";
  }) => {
    router.push({
      pathname: "/explore",
      params: {
        range: preset?.range,
        status: preset?.status,
      },
    });
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
              <Text style={styles.eyebrow}>
                {getRangeLabel(selectedRange)} Sales Summary
              </Text>
              <Text style={styles.title}>Dashboard</Text>
              <Text style={styles.subtitle}>
                {hasActiveSales
                  ? "Operational totals are driven by ACTIVE sales only, while VOID sales remain visible for audit."
                  : `${emptyRangeMessage} Totals stay at zero until a new sale is recorded in this range.`}
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
              <View style={styles.rangeHeader}>
                <Text style={styles.rangeHeaderLabel}>Summary Range</Text>
                <Text style={styles.rangeHeaderValue}>
                  {getRangeLabel(selectedRange)}
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.rangeRow}
              >
                {(
                  [
                    ["TODAY", "Today"],
                    ["THIS_WEEK", "This Week"],
                    ["THIS_MONTH", "This Month"],
                  ] as [DashboardRange, string][]
                ).map(([range, label]) => {
                  const isSelected = selectedRange === range;

                  return (
                    <Pressable
                      key={range}
                      onPress={() => setSelectedRange(range)}
                      style={[
                        styles.rangeChip,
                        isSelected && styles.rangeChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.rangeChipText,
                          isSelected && styles.rangeChipTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.metricsGrid}>
                <View style={[styles.metricCard, styles.metricCardPrimary]}>
                  <Text style={styles.metricLabel}>
                    {getRangeLabel(selectedRange)} Revenue
                  </Text>
                  <Text style={styles.metricValue}>
                    {formatMoney(todaysRevenue)}
                  </Text>
                  <Text style={styles.metricHint}>
                    {hasActiveSales
                      ? "Based on completed ACTIVE sales in this range."
                      : "No active revenue has been generated in this range yet."}
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>
                    {getRangeLabel(selectedRange)} Bills
                  </Text>
                  <Text style={styles.metricValueNumber}>
                    {todaysActiveBills}
                  </Text>
                  <Text style={styles.metricHint}>
                    {hasActiveSales
                      ? "Bills recorded and still counted as ACTIVE."
                      : "No ACTIVE bills have been recorded for this range."}
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>
                    {getRangeLabel(selectedRange)} Units Sold
                  </Text>
                  <Text style={styles.metricValueNumber}>
                    {todaysUnitsSold}
                  </Text>
                  <Text style={styles.metricHint}>
                    {hasActiveSales
                      ? "Units moved through the sales flow in this range."
                      : "Units sold will appear here once a sale is recorded."}
                  </Text>
                </View>

                <View style={[styles.metricCard, styles.metricCardAlert]}>
                  <Text style={[styles.metricLabel, styles.metricLabelAlert]}>
                    Voided Sales
                  </Text>
                  <Text style={[styles.metricValueNumber, styles.metricValueAlert]}>
                    {voidedSalesCount}
                  </Text>
                  <Text style={[styles.metricHint, styles.metricHintAlert]}>
                    {voidedSalesCount > 0
                      ? "These remain visible for audit but are excluded from revenue."
                      : "No voided sales were found in the selected period."}
                  </Text>
                </View>
              </View>

              {!hasActiveSales ? (
                <View style={styles.emptyRangeCard}>
                  <View style={styles.emptyRangeIcon}>
                    <MaterialCommunityIcons
                      name="calendar-blank-outline"
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.emptyRangeBody}>
                    <Text style={styles.emptyRangeTitle}>Quiet Sales Window</Text>
                    <Text style={styles.emptyRangeText}>
                      {emptyRangeMessage} You can start a new transaction from POS or switch
                      to another range for a wider summary.
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.quickActionsCard}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActionsGrid}>
                  <Pressable
                    onPress={() => router.push("/(tabs)")}
                    style={({ pressed }) => [
                      styles.quickActionBtn,
                      pressed && styles.quickActionBtnPressed,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="cash-register"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.quickActionBtnText}>Open POS</Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      openSalesWithPreset({
                        range: selectedRange,
                        status: "ACTIVE",
                      })
                    }
                    style={({ pressed }) => [
                      styles.quickActionBtn,
                      pressed && styles.quickActionBtnPressed,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="receipt-text-outline"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.quickActionBtnText}>View Active Sales</Text>
                  </Pressable>

                  {latestSaleId ? (
                    <Pressable
                      onPress={() => router.push(`/sales/${latestSaleId}`)}
                      style={({ pressed }) => [
                        styles.quickActionBtn,
                        styles.quickActionBtnWide,
                        pressed && styles.quickActionBtnPressed,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="history"
                        size={18}
                        color={colors.primary}
                      />
                      <Text style={styles.quickActionBtnText}>
                        Latest Sale Details
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <View style={styles.latestCard}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Latest Active Sale</Text>
                  <Pressable
                    onPress={() =>
                      openSalesWithPreset({
                        range: selectedRange,
                        status: "ACTIVE",
                      })
                    }
                  >
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
                  <View style={styles.latestEmptyWrap}>
                    <Text style={styles.emptyText}>{emptyRangeMessage}</Text>
                    <Pressable
                      onPress={() => router.push("/(tabs)")}
                      style={styles.latestEmptyAction}
                    >
                      <MaterialCommunityIcons
                        name="cash-register"
                        size={16}
                        color={colors.onPrimaryContainer}
                      />
                      <Text style={styles.latestEmptyActionText}>Open POS</Text>
                    </Pressable>
                  </View>
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
  rangeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  rangeHeaderLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.primary,
  },
  rangeHeaderValue: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  rangeRow: {
    gap: 10,
    paddingBottom: 4,
  },
  rangeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primaryContainer + "40",
    borderWidth: 1,
    borderColor: colors.primaryContainer,
  },
  rangeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rangeChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  rangeChipTextSelected: {
    color: colors.white,
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
  metricHint: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  metricHintAlert: {
    color: colors.terracotta,
  },
  emptyRangeCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant + "60",
  },
  emptyRangeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyRangeBody: {
    flex: 1,
    gap: 4,
  },
  emptyRangeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  emptyRangeText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  latestCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.outlineVariant + "60",
  },
  quickActionsCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant + "60",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickActionBtn: {
    minWidth: "48%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.primaryContainer + "45",
    borderWidth: 1,
    borderColor: colors.primaryContainer,
  },
  quickActionBtnWide: {
    width: "100%",
  },
  quickActionBtnPressed: {
    opacity: 0.86,
  },
  quickActionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
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
  latestEmptyWrap: {
    gap: 12,
  },
  latestEmptyAction: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.primaryContainer,
  },
  latestEmptyActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onPrimaryContainer,
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
