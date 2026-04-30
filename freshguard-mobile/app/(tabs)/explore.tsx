import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import { getCurrentUser, getSalesUsers, logoutUser } from "@/src/api/auth";
import { useAuthSession } from "@/src/context/auth-session";
import { getSales } from "@/src/api/sales";
import { colors, saleStatusColors } from "@/src/theme/colors";
import { theme } from "@/src/theme";
import { Sale } from "@/src/types/sale";
import { BrandMark } from "@/components/ui/brand-mark";
import { AuthUser } from "@/src/types/auth";

type SalesFilter = "ALL" | "ACTIVE" | "VOID";
type DateRangeFilter = "ALL_TIME" | "TODAY" | "THIS_WEEK" | "THIS_MONTH";
type RoleFilter = "ALL_ROLES" | "ADMIN" | "MANAGER" | "STAFF";

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor(diff / 60_000);

  if (hours >= 24) return `${Math.floor(hours / 24)}d ago`;
  if (hours >= 1) return `${hours}h ago`;
  if (mins >= 1) return `${mins}m ago`;
  return "Just now";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isToday(dateStr: string): boolean {
  const now = new Date();
  const date = new Date(dateStr);

  return (
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate()
  );
}

function getDateRangeParams(range: DateRangeFilter): {
  from?: string;
  to?: string;
} {
  if (range === "ALL_TIME") {
    return {};
  }

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

interface SaleCardProps {
  sale: Sale;
  onPress: () => void;
}

function SaleCard({ sale, onPress }: SaleCardProps) {
  const isVoid = sale.status === "VOID";
  const statusColors = saleStatusColors[sale.status];
  const hasCustomerInfo = Boolean(sale.customerName || sale.customerEmail);
  const hasReceipt = Boolean(sale.receiptImageUrl);
  const hasEdits = Boolean(sale.editedAt);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.saleCard,
        isVoid && styles.saleCardVoid,
        pressed && { opacity: 0.86 },
      ]}
    >
      <View style={styles.saleCardLeft}>
        <View
          style={[
            styles.saleIconWrap,
            { backgroundColor: isVoid ? "#fde9e4" : colors.primaryContainer + "60" },
          ]}
        >
          <MaterialCommunityIcons
            name={isVoid ? "receipt-text-remove" : "receipt-text-check"}
            size={22}
            color={isVoid ? colors.terracotta : colors.primary}
          />
        </View>

        <View style={styles.saleMeta}>
          <Text style={styles.saleId}>{sale.saleGroupId}</Text>
          <Text style={styles.saleDate}>{formatDate(sale.saleDateTime)}</Text>
          <Text style={styles.saleItems}>
            {sale.items.length} {sale.items.length === 1 ? "item" : "items"}
          </Text>
          {hasCustomerInfo ? (
            <View style={styles.saleCustomerRow}>
              <MaterialCommunityIcons
                name="account-outline"
                size={13}
                color={colors.textMuted}
              />
              <Text style={styles.saleCustomerText} numberOfLines={1}>
                {sale.customerName ?? sale.customerEmail}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.saleCardRight}>
        <Text style={styles.saleTotal}>Rs. {sale.grandTotal.toFixed(2)}</Text>
        {(hasReceipt || hasEdits) && (
          <View style={styles.saleIndicatorsRow}>
            {hasReceipt ? (
              <View style={styles.saleIndicatorChip}>
                <MaterialCommunityIcons
                  name="receipt-text"
                  size={12}
                  color={colors.primary}
                />
                <Text style={styles.saleIndicatorText}>Receipt</Text>
              </View>
            ) : null}
            {hasEdits ? (
              <View style={styles.saleIndicatorChip}>
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={12}
                  color={colors.secondary}
                />
                <Text
                  style={[
                    styles.saleIndicatorText,
                    { color: colors.secondary },
                  ]}
                >
                  Edited
                </Text>
              </View>
            ) : null}
          </View>
        )}
        <View style={[styles.badge, { backgroundColor: statusColors.background }]}>
          <Text style={[styles.badgeText, { color: statusColors.text }]}>
            {sale.status}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function SalesScreen() {
  const { setIsAuthenticated } = useAuthSession();
  const [sales, setSales] = useState<Sale[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [salesUsers, setSalesUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<SalesFilter>("ALL");
  const [selectedRange, setSelectedRange] =
    useState<DateRangeFilter>("ALL_TIME");
  const [selectedRoleFilter, setSelectedRoleFilter] =
    useState<RoleFilter>("ALL_ROLES");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreSales, setHasMoreSales] = useState(false);

  const loadSales = useCallback(async (options?: {
    isRefresh?: boolean;
    append?: boolean;
    page?: number;
  }) => {
    const isRefresh = options?.isRefresh ?? false;
    const append = options?.append ?? false;
    const page = options?.page ?? 1;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      if (!append) {
        setErrorMsg("");
      }
      const user = await getCurrentUser();
      setCurrentUser(user);

      if (user.role === "ADMIN" || user.role === "MANAGER") {
        const users = await getSalesUsers();
        setSalesUsers(users);
      } else {
        setSalesUsers([]);
        if (selectedRoleFilter !== "ALL_ROLES") {
          setSelectedRoleFilter("ALL_ROLES");
        }
      }

      const data = await getSales({
        ...getDateRangeParams(selectedRange),
        page,
        limit: 12,
      });

      setSales((current) => (append ? [...current, ...data.items] : data.items));
      setCurrentPage(data.meta?.page ?? page);
      setHasMoreSales(data.meta?.hasMore ?? false);
    } catch {
      if (!append) {
        setErrorMsg("Failed to load sales.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [selectedRange, selectedRoleFilter]);

  useFocusEffect(
    useCallback(() => {
      loadSales({ page: 1 });
    }, [loadSales])
  );

  const handleLoadMore = useCallback(() => {
    if (loadingMore || loading || refreshing || !hasMoreSales) {
      return;
    }

    loadSales({ append: true, page: currentPage + 1 });
  }, [currentPage, hasMoreSales, loadSales, loading, loadingMore, refreshing]);

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

  const filteredSales = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    const salesUsersById = new Map(salesUsers.map((user) => [user.id, user]));

    return sales.filter((sale) => {
      const matchesFilter =
        selectedFilter === "ALL" ||
        (selectedFilter === "ACTIVE" && sale.status === "ACTIVE") ||
        (selectedFilter === "VOID" && sale.status === "VOID");

      if (!matchesFilter) return false;

      if (selectedRoleFilter !== "ALL_ROLES") {
        const recordedByUser = sale.recordedBy
          ? salesUsersById.get(sale.recordedBy)
          : null;

        if (!recordedByUser || recordedByUser.role !== selectedRoleFilter) {
          return false;
        }
      }

      if (!trimmedQuery) return true;

      return (
        sale.saleGroupId.toLowerCase().includes(trimmedQuery) ||
        (sale.customerName ?? "").toLowerCase().includes(trimmedQuery) ||
        (sale.customerEmail ?? "").toLowerCase().includes(trimmedQuery)
      );
    });
  }, [sales, salesUsers, searchQuery, selectedFilter, selectedRoleFilter]);

  const voidSales = filteredSales.filter((sale) => sale.status === "VOID");
  const todaysActiveSales = sales.filter(
    (sale) => sale.status === "ACTIVE" && isToday(sale.saleDateTime)
  );
  const urgentCount = sales.filter((sale) => sale.status === "VOID").length;
  const canFilterRecordedBy =
    currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";
  const selectedRangeLabel =
    selectedRange === "ALL_TIME"
      ? "All time"
      : selectedRange === "TODAY"
      ? "Today"
      : selectedRange === "THIS_WEEK"
      ? "This week"
      : "This month";
  const selectedRoleLabel =
    selectedRoleFilter === "ALL_ROLES"
      ? "All roles"
      : selectedRoleFilter === "ADMIN"
      ? "Admins"
      : selectedRoleFilter === "MANAGER"
      ? "Managers"
      : "Staff";

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading sales center...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BrandMark size={24} />
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

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadSales({ isRefresh: true, page: 1 })}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.heroSection}>
          <View>
            <Text style={styles.eyebrow}>Sales Monitoring</Text>
            <Text style={styles.pageTitle}>Sales Center</Text>
          </View>
          {urgentCount > 0 && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentBadgeText}>{urgentCount} VOIDED</Text>
            </View>
          )}
        </View>

        <Text style={styles.pageSubtitle}>
          Search bills, filter transaction status, and review operational sales
          activity in one place.
        </Text>

        <View style={styles.searchBar}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={colors.textMuted}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by bill ID, customer name, or email"
            placeholderTextColor={colors.outline}
            style={styles.searchInput}
          />
          {searchQuery.trim() ? (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filterSummaryRow}>
          <Text style={styles.filterSummaryText}>
            {selectedRangeLabel} | {selectedRoleLabel}
          </Text>
          <Pressable
            onPress={() => setShowAdvancedFilters((current) => !current)}
            style={styles.moreFiltersBtn}
          >
            <MaterialCommunityIcons
              name={showAdvancedFilters ? "tune-off" : "tune-variant"}
              size={16}
              color={colors.primary}
            />
            <Text style={styles.moreFiltersBtnText}>More Filters</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {(["ALL", "ACTIVE", "VOID"] as SalesFilter[]).map((filter) => {
            const isSelected = selectedFilter === filter;

            return (
              <Pressable
                key={filter}
                onPress={() => setSelectedFilter(filter)}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextSelected,
                  ]}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {showAdvancedFilters && (
          <View style={styles.advancedFiltersCard}>
            <View style={styles.rangeHeader}>
              <Text style={styles.rangeHeaderLabel}>Date Range</Text>
              <Text style={styles.rangeHeaderValue}>{selectedRangeLabel}</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rangeRow}
            >
              {(
                [
                  ["ALL_TIME", "All Time"],
                  ["TODAY", "Today"],
                  ["THIS_WEEK", "This Week"],
                  ["THIS_MONTH", "This Month"],
                ] as [DateRangeFilter, string][]
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

            {canFilterRecordedBy && (
              <>
                <View style={styles.rangeHeader}>
                  <Text style={styles.rangeHeaderLabel}>Recorded By Role</Text>
                  <Text style={styles.rangeHeaderValue}>{selectedRoleLabel}</Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.rangeRow}
                >
                  {(
                    [
                      ["ALL_ROLES", "All Roles"],
                      ["ADMIN", "Admins"],
                      ["MANAGER", "Managers"],
                      ["STAFF", "Staff"],
                    ] as [RoleFilter, string][]
                  ).map(([role, label]) => {
                    const isSelected = selectedRoleFilter === role;

                    return (
                      <Pressable
                        key={role}
                        onPress={() => setSelectedRoleFilter(role)}
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
              </>
            )}

            <Pressable
              onPress={() => {
                setSelectedRange("ALL_TIME");
                setSelectedRoleFilter("ALL_ROLES");
              }}
              style={styles.clearFiltersBtn}
            >
              <MaterialCommunityIcons
                name="filter-remove-outline"
                size={16}
                color={colors.terracotta}
              />
              <Text style={styles.clearFiltersBtnText}>
                Clear Advanced Filters
              </Text>
            </Pressable>
          </View>
        )}

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <MaterialCommunityIcons
              name="chart-donut"
              size={22}
              color={colors.primary}
            />
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              Current Snapshot
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.primaryContainer }]}>
              <Text style={styles.statValue}>{todaysActiveSales.length}</Text>
              <Text style={styles.statLabel}>Active Bills Today</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: "#fde9e4" }]}>
              <Text style={[styles.statValue, { color: colors.terracotta }]}>
                {urgentCount}
              </Text>
              <Text style={styles.statLabel}>Voided Sales</Text>
            </View>

            <View style={[styles.statCardWide, { backgroundColor: colors.secondaryContainer }]}>
              <Text style={[styles.statValueWide, { color: colors.secondary }]}>
                Rs.{" "}
                {todaysActiveSales
                  .reduce((sum, sale) => sum + sale.grandTotal, 0)
                  .toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>Today&apos;s Revenue</Text>
            </View>
          </View>
        </View>

        {voidSales.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <MaterialCommunityIcons
                name="alert-octagon"
                size={22}
                color={colors.terracotta}
              />
              <Text style={[styles.sectionTitle, { color: colors.terracotta }]}>
                Matching Voided Sales
              </Text>
            </View>

            {voidSales.slice(0, 3).map((sale) => (
              <Pressable
                key={sale._id}
                onPress={() => router.push(`/sales/${sale._id}`)}
                style={({ pressed }) => [
                  styles.actionCard,
                  styles.actionCardRed,
                  pressed && { opacity: 0.88 },
                ]}
              >
                <View style={styles.actionCardIcon}>
                  <MaterialCommunityIcons
                    name="receipt-text-remove"
                    size={22}
                    color={colors.terracotta}
                  />
                </View>

                <View style={styles.actionCardBody}>
                  <Text style={styles.actionCardTitle}>{sale.saleGroupId}</Text>
                  <View style={styles.actionCardMeta}>
                    <MaterialCommunityIcons
                      name="clock-remove-outline"
                      size={14}
                      color={colors.terracotta}
                    />
                    <Text style={styles.actionCardMetaText}>
                      Voided {formatRelativeTime(sale.voidedAt ?? sale.updatedAt)}
                    </Text>
                  </View>
                  {sale.voidReason ? (
                    <Text style={styles.actionCardReason} numberOfLines={1}>
                      &quot;{sale.voidReason}&quot;
                    </Text>
                  ) : null}
                </View>

                <View style={styles.actionBtn}>
                  <Text style={styles.actionBtnText}>DETAILS</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <MaterialCommunityIcons
              name="receipt-text-check"
              size={22}
              color={colors.secondary}
            />
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
              Filtered Sales
            </Text>
          </View>

          {filteredSales.length === 0 ? (
            <View style={styles.emptySection}>
              <MaterialCommunityIcons
                name="file-search-outline"
                size={40}
                color={colors.outline}
              />
              <Text style={styles.emptySectionText}>
                No sales match the current search and filter.
              </Text>
            </View>
          ) : (
            <>
              {filteredSales.map((sale) => (
                <SaleCard
                  key={sale._id}
                  sale={sale}
                  onPress={() => router.push(`/sales/${sale._id}`)}
                />
              ))}

              {searchQuery.trim() === "" &&
              selectedFilter === "ALL" &&
              selectedRoleFilter === "ALL_ROLES" &&
              hasMoreSales ? (
                <Pressable
                  onPress={handleLoadMore}
                  disabled={loadingMore}
                  style={({ pressed }) => [
                    styles.loadMoreButton,
                    pressed && !loadingMore && styles.loadMoreButtonPressed,
                    loadingMore && styles.loadMoreButtonDisabled,
                  ]}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <MaterialCommunityIcons
                      name="chevron-double-down"
                      size={18}
                      color={colors.primary}
                    />
                  )}
                  <Text style={styles.loadMoreButtonText}>
                    {loadingMore ? "Loading more sales..." : "Load More Sales"}
                  </Text>
                </Pressable>
              ) : null}

              {searchQuery.trim() === "" &&
              selectedFilter === "ALL" &&
              selectedRoleFilter === "ALL_ROLES" &&
              !hasMoreSales &&
              sales.length > 0 ? (
                <Text style={styles.endOfListText}>
                  You&apos;ve reached the end of the sales history for this range.
                </Text>
              ) : null}
            </>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { color: colors.textMuted, fontSize: 15 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface + "cc",
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + "40",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  appTitle: { fontSize: 18, fontWeight: "700", color: colors.primary },
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
  logoutButtonPressed: { opacity: 0.85 },
  logoutButtonDisabled: { opacity: 0.7 },
  logoutText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.terracotta,
  },
  scroll: { padding: 20, gap: 4 },
  heroSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.primary,
  },
  pageTitle: { fontSize: 30, fontWeight: "700", color: colors.text },
  urgentBadge: {
    backgroundColor: colors.terracotta,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  urgentBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.5,
  },
  pageSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 16,
    lineHeight: 20,
  },
  rangeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  rangeHeaderLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  rangeHeaderValue: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  rangeRow: {
    gap: 10,
    paddingBottom: 12,
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant + "60",
    ...theme.shadows.card,
  },
  filterSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
  },
  filterSummaryText: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  moreFiltersBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.primaryContainer + "50",
    borderWidth: 1,
    borderColor: colors.primaryContainer,
  },
  moreFiltersBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 0,
  },
  filterRow: {
    gap: 10,
    paddingVertical: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant + "70",
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  filterChipTextSelected: {
    color: colors.white,
  },
  advancedFiltersCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant + "60",
    padding: 14,
    gap: 4,
    marginBottom: 8,
    ...theme.shadows.card,
  },
  clearFiltersBtn: {
    marginTop: 6,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.terracottaSoft + "55",
    borderWidth: 1,
    borderColor: colors.terracottaSoft,
  },
  clearFiltersBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.terracotta,
  },
  errorText: {
    color: colors.terracotta,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  section: { marginTop: 16, gap: 10 },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "47%",
    borderRadius: 14,
    padding: 14,
    gap: 4,
    ...theme.shadows.card,
  },
  statCardWide: {
    width: "100%",
    borderRadius: 14,
    padding: 14,
    gap: 4,
    ...theme.shadows.card,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.onPrimaryContainer,
  },
  statValueWide: {
    fontSize: 24,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant + "60",
    ...theme.shadows.card,
  },
  actionCardRed: {
    borderLeftWidth: 4,
    borderLeftColor: colors.terracotta,
  },
  actionCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fde9e4",
    alignItems: "center",
    justifyContent: "center",
  },
  actionCardBody: { flex: 1, gap: 2 },
  actionCardTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  actionCardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionCardMetaText: {
    fontSize: 12,
    color: colors.terracotta,
    fontWeight: "600",
  },
  actionCardReason: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  actionBtn: {
    backgroundColor: colors.terracotta,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.5,
  },
  saleCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant + "50",
    ...theme.shadows.card,
  },
  saleCardVoid: {
    opacity: 0.78,
    borderStyle: "dashed",
  },
  saleCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  saleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saleMeta: { gap: 2, flex: 1 },
  saleId: { fontSize: 15, fontWeight: "700", color: colors.text },
  saleDate: { fontSize: 12, color: colors.textMuted },
  saleItems: { fontSize: 12, color: colors.textMuted },
  saleCustomerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  saleCustomerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  saleCardRight: { alignItems: "flex-end", gap: 6, maxWidth: 132 },
  saleTotal: { fontSize: 15, fontWeight: "800", color: colors.primary },
  saleIndicatorsRow: {
    alignItems: "flex-end",
    gap: 4,
  },
  saleIndicatorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.primaryContainer + "55",
  },
  saleIndicatorText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  emptySection: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  emptySectionText: { fontSize: 14, color: colors.textMuted, textAlign: "center" },
  loadMoreButton: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.primaryContainer + "55",
    borderWidth: 1,
    borderColor: colors.primaryContainer,
  },
  loadMoreButtonPressed: {
    opacity: 0.88,
  },
  loadMoreButtonDisabled: {
    opacity: 0.72,
  },
  loadMoreButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  endOfListText: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
});

