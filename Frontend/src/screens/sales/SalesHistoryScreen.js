import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSales } from '../../api';
import { MAIN_BOTTOM_NAV_HEIGHT } from '../../components/BottomNav';
import WorkspaceHeader from '../../components/WorkspaceHeader';
import { salesColors } from '../../sales/theme';
import {
  formatDate,
  formatMoney,
  formatRelativeTime,
  getDashboardRangeLabel,
  getHistoryRangeParams,
  parseRangeFilter,
  parseStatusFilter,
} from '../../sales/utils';
import { colors } from '../../theme';

const STATUS_OPTIONS = ['ALL', 'ACTIVE', 'VOID'];
const RANGE_OPTIONS = ['ALL_TIME', 'TODAY', 'THIS_WEEK', 'THIS_MONTH'];

export default function SalesHistoryScreen({
  sessionUser,
  onLogout,
  onOpenSaleDetails,
}) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [rangeFilter, setRangeFilter] = useState('ALL_TIME');
  const [meta, setMeta] = useState({ page: 1, hasMore: false });

  const loadSales = useCallback(async ({ page = 1, append = false, isRefresh = false } = {}) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      if (!append) setErrorMsg('');
      const result = await getSales({
        ...getHistoryRangeParams(rangeFilter),
        status: statusFilter,
        page,
        limit: 12,
      });

      setSales((current) => (append ? [...current, ...result.items] : result.items));
      setMeta({
        page: result.meta?.page || page,
        hasMore: Boolean(result.meta?.hasMore),
      });
    } catch (error) {
      if (!append) {
        setErrorMsg(error.message || 'Could not load sales.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [rangeFilter, statusFilter]);

  useFocusEffect(
    useCallback(() => {
      loadSales({ page: 1 });
    }, [loadSales])
  );

  const filteredSales = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sales.filter((sale) => {
      if (!query) return true;
      const itemMatch = (sale.items || []).some((item) => (
        String(item.productNameSnapshot || '').toLowerCase().includes(query)
      ));
      return itemMatch
        || String(sale.saleGroupId || '').toLowerCase().includes(query)
        || String(sale.customerName || '').toLowerCase().includes(query)
        || String(sale.customerEmail || '').toLowerCase().includes(query);
    });
  }, [sales, searchQuery]);

  function handleLoadMore() {
    if (!meta.hasMore || loading || refreshing || loadingMore) return;
    loadSales({ page: meta.page + 1, append: true });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSales({ page: 1, isRefresh: true })} />}
      >
        <WorkspaceHeader
          pillLabel={`${String(sessionUser?.role || 'STAFF').toUpperCase()} Sales History`}
          pillIcon="receipt-text-outline"
          onLogout={onLogout}
        />

        <View style={styles.heroBlock}>
          <Text style={styles.eyebrow}>Sales Monitoring</Text>
          <Text style={styles.title}>Sales Center</Text>
          <Text style={styles.subtitle}>
            Search bills, filter transaction status, and review recorded sales activity in one place.
          </Text>
        </View>

        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color={salesColors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by bill ID, customer, email, or product"
            placeholderTextColor={salesColors.outline}
            style={styles.searchInput}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {STATUS_OPTIONS.map((status) => {
            const selected = statusFilter === status;
            return (
              <Pressable key={status} onPress={() => setStatusFilter(parseStatusFilter(status))} style={[styles.filterChip, selected && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{status}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {RANGE_OPTIONS.map((range) => {
            const selected = rangeFilter === range;
            return (
              <Pressable key={range} onPress={() => setRangeFilter(parseRangeFilter(range))} style={[styles.rangeChip, selected && styles.rangeChipActive]}>
                <Text style={[styles.rangeChipText, selected && styles.rangeChipTextActive]}>
                  {range === 'ALL_TIME' ? 'All Time' : getDashboardRangeLabel(range)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={salesColors.primary} />
            <Text style={styles.loadingText}>Loading sales...</Text>
          </View>
        ) : (
          <>
            {errorMsg ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{errorMsg}</Text>
                <Pressable onPress={() => loadSales({ page: 1 })} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Try Again</Text>
                </Pressable>
              </View>
            ) : null}

            {filteredSales.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No sales match the current view.</Text>
                <Text style={styles.emptyBody}>
                  Try another bill ID, customer detail, or clear the current filters to widen this sales view again.
                </Text>
              </View>
            ) : (
              filteredSales.map((sale) => {
                const isVoid = sale.status === 'VOID';
                return (
                  <Pressable
                    key={sale.id}
                    onPress={() => onOpenSaleDetails(sale.id)}
                    style={[styles.saleCard, isVoid && styles.saleCardVoid]}
                  >
                    <View style={styles.saleLeft}>
                      <View style={[styles.saleIcon, isVoid && styles.saleIconVoid]}>
                        <MaterialCommunityIcons
                          name={isVoid ? 'receipt-text-remove' : 'receipt-text-check'}
                          size={20}
                          color={isVoid ? salesColors.terracotta : salesColors.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.saleId}>{sale.saleGroupId}</Text>
                        <Text style={styles.saleMeta}>
                          {formatDate(sale.saleDateTime)} | {formatRelativeTime(sale.saleDateTime)}
                        </Text>
                        <Text style={styles.saleMeta}>
                          {(sale.items || []).length} {(sale.items || []).length === 1 ? 'item' : 'items'}
                        </Text>
                        {sale.customerName || sale.customerEmail ? (
                          <Text style={styles.saleCustomer} numberOfLines={1}>
                            {sale.customerName || sale.customerEmail}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.saleRight}>
                      <Text style={styles.saleAmount}>{formatMoney(sale.grandTotal)}</Text>
                      <View style={[styles.badge, isVoid ? styles.badgeVoid : styles.badgeActive]}>
                        <Text style={[styles.badgeText, isVoid ? styles.badgeTextVoid : styles.badgeTextActive]}>
                          {sale.status}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}

            {meta.hasMore && searchQuery.trim() === '' ? (
              <Pressable onPress={handleLoadMore} style={styles.loadMoreBtn}>
                {loadingMore ? (
                  <ActivityIndicator size="small" color={salesColors.primary} />
                ) : (
                  <Text style={styles.loadMoreText}>Load More Sales</Text>
                )}
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: MAIN_BOTTOM_NAV_HEIGHT + 40, gap: 14 },
  heroBlock: { gap: 6 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: salesColors.primary },
  title: { fontSize: 32, fontWeight: '900', color: colors.slate, letterSpacing: -0.8 },
  subtitle: { fontSize: 14, lineHeight: 20, color: salesColors.textMuted },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: salesColors.surface, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: `${salesColors.outlineVariant}88` },
  searchInput: { flex: 1, fontSize: 14, color: salesColors.text },
  filterRow: { gap: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: salesColors.surfaceHighest, borderWidth: 1, borderColor: `${salesColors.outlineVariant}88` },
  filterChipActive: { backgroundColor: salesColors.primary, borderColor: salesColors.primary },
  filterChipText: { fontSize: 12, fontWeight: '700', color: salesColors.textMuted },
  filterChipTextActive: { color: salesColors.white },
  rangeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: `${salesColors.primaryContainer}55`, borderWidth: 1, borderColor: salesColors.primaryContainer },
  rangeChipActive: { backgroundColor: salesColors.primary, borderColor: salesColors.primary },
  rangeChipText: { fontSize: 12, fontWeight: '700', color: salesColors.primary },
  rangeChipTextActive: { color: salesColors.white },
  centered: { alignItems: 'center', gap: 10, paddingVertical: 30 },
  loadingText: { fontSize: 14, color: salesColors.textMuted },
  errorCard: { backgroundColor: `${salesColors.tertiaryContainer}55`, borderRadius: 16, padding: 14, gap: 10 },
  errorText: { fontSize: 13, lineHeight: 19, color: salesColors.terracotta, fontWeight: '600' },
  retryBtn: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: salesColors.white },
  retryBtnText: { fontSize: 12, fontWeight: '700', color: salesColors.terracotta },
  emptyCard: { backgroundColor: salesColors.surface, borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: `${salesColors.outlineVariant}88` },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: salesColors.text },
  emptyBody: { fontSize: 13, lineHeight: 19, color: salesColors.textMuted },
  saleCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: salesColors.surface, borderWidth: 1, borderColor: `${salesColors.outlineVariant}88` },
  saleCardVoid: { opacity: 0.8 },
  saleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  saleIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: `${salesColors.primaryContainer}66`, alignItems: 'center', justifyContent: 'center' },
  saleIconVoid: { backgroundColor: `${salesColors.tertiaryContainer}66` },
  saleId: { fontSize: 15, fontWeight: '700', color: salesColors.text },
  saleMeta: { fontSize: 12, color: salesColors.textMuted },
  saleCustomer: { marginTop: 2, fontSize: 12, fontWeight: '600', color: salesColors.textMuted },
  saleRight: { alignItems: 'flex-end', gap: 6, maxWidth: 130 },
  saleAmount: { fontSize: 15, fontWeight: '800', color: salesColors.primary },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeActive: { backgroundColor: salesColors.primaryContainer },
  badgeVoid: { backgroundColor: salesColors.tertiaryContainer },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  badgeTextActive: { color: salesColors.primary },
  badgeTextVoid: { color: salesColors.terracotta },
  loadMoreBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: `${salesColors.primaryContainer}55`, borderWidth: 1, borderColor: salesColors.primaryContainer },
  loadMoreText: { fontSize: 13, fontWeight: '700', color: salesColors.primary },
});
