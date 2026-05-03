import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getBatches } from '../api';

const DISMISSED_KEY = 'invigo_dismissed_alerts';
import Card from '../components/Card';
import Screen from '../components/Screen';
import WorkspaceHeader from '../components/WorkspaceHeader';
import { colors } from '../theme';

// ── Risk helpers ───────────────────────────────────────────────────────────────
function daysLeft(expiryDate) {
  if (!expiryDate) return null;
  return Math.ceil((new Date(expiryDate) - Date.now()) / 86400000);
}

function getRiskLevel(batch) {
  const days = daysLeft(batch.expiryDate);
  const qty  = batch.quantityOnHand ?? 0;
  if (days !== null && days < 0)   return 'EXPIRED';
  if (days !== null && days <= 7)  return 'CRITICAL';
  if (qty === 0)                   return 'CRITICAL';
  if (days !== null && days <= 30) return 'HIGH';
  if (qty <= 10)                   return 'HIGH';
  if (days !== null && days <= 60) return 'MEDIUM';
  return null; // LOW — not shown
}

const LEVEL_META = {
  EXPIRED:  { label: 'Expired',  color: '#DC2626', bg: '#FEF2F2', icon: 'skull-outline' },
  CRITICAL: { label: 'Critical', color: '#DC2626', bg: '#FEF2F2', icon: 'alert-circle-outline' },
  HIGH:     { label: 'High',     color: '#D97706', bg: '#FFFBEB', icon: 'warning-outline' },
  MEDIUM:   { label: 'Medium',   color: '#7C3AED', bg: '#F5F3FF', icon: 'time-outline' },
};

const FILTERS = ['ALL', 'EXPIRED', 'CRITICAL', 'HIGH', 'MEDIUM'];
const SORT_OPTIONS = [
  { label: 'Expiry', value: 'expiry' },
  { label: 'Level',  value: 'level' },
  { label: 'Qty',    value: 'qty' },
];
const LEVEL_ORDER = { EXPIRED: 0, CRITICAL: 1, HIGH: 2, MEDIUM: 3 };

// ── Sub-components ─────────────────────────────────────────────────────────────
function SummaryTile({ icon, label, value, color }) {
  return (
    <View style={[styles.summaryTile, { borderTopColor: color }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function AlertCard({ item, onDismiss }) {
  const days  = item.daysLeft;
  const level = LEVEL_META[item.riskLevel];
  const isExpired = item.riskLevel === 'EXPIRED';

  return (
    <View style={[styles.alertCard, { borderLeftColor: level.color }]}>
      <View style={styles.alertLeft}>
        <Text style={styles.alertProduct} numberOfLines={1}>{item.productName}</Text>
        {!!item.batchNumber && (
          <Text style={styles.alertBatch}>Batch #{item.batchNumber}</Text>
        )}

        <View style={styles.chipsRow}>
          <View style={[styles.chip, { backgroundColor: level.bg }]}>
            <Text style={[styles.chipText, { color: level.color }]}>
              {isExpired ? 'EXPIRED' : days !== null ? `${days}d left` : 'No date'}
            </Text>
          </View>
          <View style={[styles.chip, { backgroundColor: item.quantityOnHand === 0 ? '#FEF2F2' : 'rgba(15,23,42,0.06)' }]}>
            <Text style={[styles.chipText, { color: item.quantityOnHand === 0 ? '#DC2626' : 'rgba(15,23,42,0.55)' }]}>
              {item.quantityOnHand === 0 ? 'Out of stock' : `Qty: ${item.quantityOnHand}`}
            </Text>
          </View>
          {!!item.productCategory && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{item.productCategory}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.alertRight}>
        <View style={[styles.levelBadge, { backgroundColor: level.bg }]}>
          <Ionicons name={level.icon} size={13} color={level.color} />
          <Text style={[styles.levelText, { color: level.color }]}>{level.label}</Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn} hitSlop={8}>
          <Ionicons name="close-circle-outline" size={18} color="rgba(15,23,42,0.3)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Dismiss key for a batch alert ─────────────────────────────────────────────
function dismissKey(item) {
  return `${item.id || item._id}_${item.riskLevel}`;
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function AlertsScreen({ go, sessionUser, onLogout }) {
  const [batches,    setBatches]    = useState([]);
  const [dismissed,  setDismissed]  = useState(new Set());
  const [showDismissed, setShowDismissed] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [sortBy,     setSortBy]     = useState('expiry');
  const [query,      setQuery]      = useState('');

  // Load dismissed list from storage
  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((raw) => { if (raw) setDismissed(new Set(JSON.parse(raw))); })
      .catch(() => {});
  }, []);

  async function saveDismissed(next) {
    setDismissed(next);
    await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])).catch(() => {});
  }

  async function dismissAlert(item) {
    const next = new Set(dismissed);
    next.add(dismissKey(item));
    await saveDismissed(next);
  }

  async function restoreAlert(item) {
    const next = new Set(dismissed);
    next.delete(dismissKey(item));
    await saveDismissed(next);
  }

  async function clearAllDismissed() {
    await saveDismissed(new Set());
  }

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError('');
    try {
      const data = await getBatches();
      setBatches(data || []);
    } catch (e) {
      setError(e.message || 'Could not load alert data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const annotated = useMemo(() =>
    batches
      .map((b) => ({
        ...b,
        riskLevel:   b.riskLevel || getRiskLevel(b),
        daysLeft:    b.daysLeft  ?? daysLeft(b.expiryDate),
        productName: typeof b.productId === 'object' ? (b.productId?.name || 'Unknown') : (b.productName || 'Unknown'),
        productCategory: typeof b.productId === 'object' ? (b.productId?.category || '') : '',
      }))
      .filter((b) => b.riskLevel && b.riskLevel !== null),
  [batches]);

  const summary = useMemo(() => ({
    expired:  annotated.filter((b) => b.riskLevel === 'EXPIRED').length,
    critical: annotated.filter((b) => b.riskLevel === 'CRITICAL').length,
    high:     annotated.filter((b) => b.riskLevel === 'HIGH').length,
    medium:   annotated.filter((b) => b.riskLevel === 'MEDIUM').length,
  }), [annotated]);

  const { active: activeAlerts, dismissed: dismissedAlerts } = useMemo(() => {
    const active    = [];
    const dismissed_list = [];
    annotated.forEach((b) => {
      if (dismissed.has(dismissKey(b))) dismissed_list.push(b);
      else active.push(b);
    });
    return { active: active, dismissed: dismissed_list };
  }, [annotated, dismissed]);

  const displayed = useMemo(() => {
    let list = [...(showDismissed ? dismissedAlerts : activeAlerts)];
    if (levelFilter !== 'ALL') list = list.filter((b) => b.riskLevel === levelFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((b) =>
        (b.productName || '').toLowerCase().includes(q) ||
        (b.batchNumber || '').toLowerCase().includes(q)
      );
    }
    if (sortBy === 'expiry') list.sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999));
    else if (sortBy === 'level') list.sort((a, b) => (LEVEL_ORDER[a.riskLevel] ?? 9) - (LEVEL_ORDER[b.riskLevel] ?? 9));
    else if (sortBy === 'qty') list.sort((a, b) => (a.quantityOnHand ?? 0) - (b.quantityOnHand ?? 0));
    return list;
  }, [annotated, levelFilter, sortBy, query]);

  return (
    <Screen scroll={false} style={{ paddingBottom: 0 }}>
      <WorkspaceHeader
        pillLabel="Expiry Alerts"
        pillIcon="alert-circle-outline"
        pillColor={colors.danger}
        onLogout={onLogout}
        go={go}
        role={sessionUser?.role}
        sessionUser={sessionUser}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadData(true)} />}
      >
        <View style={styles.pageHeader}>
          <Text style={[styles.kicker, { color: colors.danger }]}>Risk Control</Text>
          <Text style={styles.title}>Expiry &amp; Stock Alerts</Text>
          <Text style={styles.sub}>
            Batches flagged for expiry or low stock are shown here. Stock levels update automatically as sales are processed — when a batch reaches zero through POS sales it appears as Critical.
          </Text>
        </View>

        {!!error && <Text style={styles.warn}>{error}</Text>}

        {/* Summary row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
          <View style={styles.summaryRow}>
            <SummaryTile icon="skull-outline"         label="Expired"  value={summary.expired}  color="#DC2626" />
            <SummaryTile icon="alert-circle-outline"  label="Critical" value={summary.critical} color="#DC2626" />
            <SummaryTile icon="warning-outline"       label="High"     value={summary.high}     color="#D97706" />
            <SummaryTile icon="time-outline"          label="Medium"   value={summary.medium}   color="#7C3AED" />
            <SummaryTile icon="shield-checkmark-outline" label="Total Alerts" value={annotated.length} color={colors.slate} />
          </View>
        </ScrollView>

        <Card>
          {/* Search */}
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color="rgba(15,23,42,0.4)" style={{ marginRight: 8 }} />
            <Text
              style={styles.searchPlaceholder}
              onPress={() => {}}
            >Search product or batch…</Text>
          </View>

          {/* Level filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <View style={styles.filterRow}>
              {FILTERS.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setLevelFilter(f)}
                  style={[styles.filterChip, levelFilter === f && styles.filterChipActive]}
                >
                  <Text style={[styles.filterText, levelFilter === f && styles.filterTextActive]}>
                    {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Sort */}
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Sort:</Text>
            {SORT_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setSortBy(opt.value)}
                style={[styles.sortBtn, sortBy === opt.value && styles.sortBtnActive]}
              >
                <Text style={[styles.sortText, sortBy === opt.value && { color: '#fff' }]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Dismissed toggle */}
          <View style={styles.dismissedRow}>
            <Pressable
              style={[styles.dismissedToggle, showDismissed && styles.dismissedToggleActive]}
              onPress={() => setShowDismissed((v) => !v)}
            >
              <Ionicons
                name={showDismissed ? 'eye-outline' : 'eye-off-outline'}
                size={14}
                color={showDismissed ? colors.slate : 'rgba(15,23,42,0.45)'}
              />
              <Text style={[styles.dismissedToggleText, showDismissed && { color: colors.slate }]}>
                {showDismissed ? `Dismissed (${dismissedAlerts.length})` : `Show Dismissed (${dismissedAlerts.length})`}
              </Text>
            </Pressable>
            {showDismissed && dismissedAlerts.length > 0 && (
              <Pressable onPress={clearAllDismissed} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>Clear All</Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.countText}>
            {displayed.length} alert{displayed.length !== 1 ? 's' : ''}
            {levelFilter !== 'ALL' ? ` · ${levelFilter}` : ''}
            {showDismissed ? ' · dismissed' : ''}
          </Text>

          {displayed.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="checkmark-circle-outline" size={40} color={colors.emerald} />
              <Text style={styles.emptyText}>
                {showDismissed
                  ? 'No dismissed alerts.'
                  : annotated.length === 0
                    ? 'All batches look healthy!'
                    : `No ${levelFilter.toLowerCase()} alerts.`}
              </Text>
            </View>
          ) : (
            displayed.map((item) => (
              <AlertCard
                key={`${item.id}_${item.riskLevel}`}
                item={item}
                onDismiss={showDismissed ? () => restoreAlert(item) : () => dismissAlert(item)}
              />
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageHeader:    { marginTop: 4, marginBottom: 18 },
  kicker:        { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  title:         { color: colors.slate, fontSize: 31, fontWeight: '900', letterSpacing: -1.2 },
  sub:           { color: 'rgba(15,23,42,0.58)', fontWeight: '700', lineHeight: 22, marginTop: 8 },
  warn:          { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', color: '#92400E', padding: 12, borderRadius: 16, fontWeight: '800', marginBottom: 14 },
  summaryRow:    { flexDirection: 'row', gap: 10, paddingRight: 4 },
  summaryTile:   { backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)', borderRadius: 22, padding: 14, alignItems: 'center', minWidth: 80, borderTopWidth: 3, gap: 4 },
  summaryValue:  { fontSize: 22, fontWeight: '900', marginTop: 2 },
  summaryLabel:  { color: 'rgba(15,23,42,0.5)', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' },
  searchWrap:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(15,23,42,0.1)', borderRadius: 18, paddingHorizontal: 14, height: 44, backgroundColor: 'rgba(255,255,255,0.6)', marginBottom: 10 },
  searchPlaceholder: { color: 'rgba(15,23,42,0.35)', fontWeight: '700', flex: 1 },
  filterRow:     { flexDirection: 'row', gap: 8, marginBottom: 4 },
  filterChip:    { paddingHorizontal: 14, height: 36, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(15,23,42,0.1)', backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { backgroundColor: colors.slate, borderColor: colors.slate },
  filterText:    { color: 'rgba(15,23,42,0.55)', fontWeight: '800', fontSize: 12 },
  filterTextActive: { color: '#fff' },
  sortRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sortLabel:     { color: 'rgba(15,23,42,0.45)', fontSize: 12, fontWeight: '800' },
  sortBtn:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(15,23,42,0.06)' },
  sortBtnActive: { backgroundColor: colors.slate },
  sortText:      { fontSize: 12, fontWeight: '800', color: 'rgba(15,23,42,0.55)' },
  countText:     { color: 'rgba(15,23,42,0.4)', fontSize: 11, fontWeight: '800', marginBottom: 12 },
  emptyWrap:     { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText:     { color: 'rgba(15,23,42,0.45)', fontWeight: '800', textAlign: 'center' },
  alertCard:       { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 18, padding: 14, marginBottom: 10, borderLeftWidth: 3, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  alertLeft:       { flex: 1 },
  alertRight:      { alignItems: 'flex-end', gap: 8, marginLeft: 8 },
  alertProduct:    { color: colors.slate, fontWeight: '900', fontSize: 14 },
  alertBatch:      { color: 'rgba(15,23,42,0.45)', fontSize: 11, fontWeight: '700', marginTop: 2 },
  chipsRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip:            { backgroundColor: 'rgba(15,23,42,0.06)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  chipText:        { color: 'rgba(15,23,42,0.55)', fontSize: 11, fontWeight: '700' },
  levelBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  levelText:       { fontSize: 11, fontWeight: '900' },
  dismissBtn:      { padding: 2 },
  dismissedRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  dismissedToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(15,23,42,0.1)', backgroundColor: 'rgba(255,255,255,0.6)' },
  dismissedToggleActive: { backgroundColor: 'rgba(15,23,42,0.06)', borderColor: 'rgba(15,23,42,0.2)' },
  dismissedToggleText:   { fontSize: 12, fontWeight: '800', color: 'rgba(15,23,42,0.45)' },
  clearBtn:        { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  clearBtnText:    { fontSize: 12, fontWeight: '900', color: '#DC2626' },
});
