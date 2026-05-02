import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSales, getSalesDashboardSummary } from '../../api';
import { MAIN_BOTTOM_NAV_HEIGHT } from '../../components/BottomNav';
import WorkspaceHeader from '../../components/WorkspaceHeader';
import { salesColors } from '../../sales/theme';
import { formatMoney, getDashboardRangeParams } from '../../sales/utils';
import { colors } from '../../theme';

export default function SalesReportsScreen({ sessionUser, onLogout, onOpenHistory, onOpenPos }) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [report, setReport] = useState({
    today: null,
    week: null,
    month: null,
    recentSales: [],
  });

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const [today, week, month, recent] = await Promise.all([
        getSalesDashboardSummary(getDashboardRangeParams('TODAY')),
        getSalesDashboardSummary(getDashboardRangeParams('THIS_WEEK')),
        getSalesDashboardSummary(getDashboardRangeParams('THIS_MONTH')),
        getSales({ page: 1, limit: 5, status: 'ALL' }),
      ]);

      setReport({
        today,
        week,
        month,
        recentSales: recent.items || [],
      });
    } catch (error) {
      setErrorMsg(error.message || 'Could not load report insights.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [loadReport])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <WorkspaceHeader
          pillLabel={`${String(sessionUser?.role || 'STAFF').toUpperCase()} Reports`}
          pillIcon="bar-chart-outline"
          onLogout={onLogout}
        />

        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Sales Reports</Text>
          <Text style={styles.heroTitle}>Live Performance Snapshot</Text>
          <Text style={styles.heroBody}>
            This page uses the real backend totals, so your staff and admin team can review sales movement without leaving the mobile app.
          </Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={salesColors.primary} />
            <Text style={styles.loadingText}>Loading report insights...</Text>
          </View>
        ) : (
          <>
            {errorMsg ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{errorMsg}</Text>
                <Pressable onPress={loadReport} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Try Again</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.grid}>
              <ReportCard title="Today" revenue={report.today?.todaysRevenue} bills={report.today?.todaysActiveBills} voided={report.today?.voidedSalesCount} />
              <ReportCard title="This Week" revenue={report.week?.todaysRevenue} bills={report.week?.todaysActiveBills} voided={report.week?.voidedSalesCount} />
              <ReportCard title="This Month" revenue={report.month?.todaysRevenue} bills={report.month?.todaysActiveBills} voided={report.month?.voidedSalesCount} wide />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent Sales</Text>
              {(report.recentSales || []).length === 0 ? (
                <Text style={styles.cardBody}>No sales have been recorded yet.</Text>
              ) : (
                report.recentSales.map((sale) => (
                  <View key={sale.id} style={styles.recentRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recentId}>{sale.saleGroupId}</Text>
                      <Text style={styles.recentMeta}>{sale.status} | {(sale.items || []).length} items</Text>
                    </View>
                    <Text style={styles.recentAmount}>{formatMoney(sale.grandTotal)}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Quick Actions</Text>
              <View style={styles.actionRow}>
                <Pressable onPress={onOpenPos} style={styles.actionBtn}>
                  <MaterialCommunityIcons name="cash-register" size={18} color={salesColors.primary} />
                  <Text style={styles.actionBtnText}>Open POS</Text>
                </Pressable>
                <Pressable onPress={onOpenHistory} style={styles.actionBtn}>
                  <MaterialCommunityIcons name="receipt-text-outline" size={18} color={salesColors.primary} />
                  <Text style={styles.actionBtnText}>Open Sales</Text>
                </Pressable>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReportCard({ title, revenue, bills, voided, wide = false }) {
  return (
    <View style={[styles.reportCard, wide && styles.reportCardWide]}>
      <Text style={styles.reportTitle}>{title}</Text>
      <Text style={styles.reportRevenue}>{formatMoney(revenue || 0)}</Text>
      <Text style={styles.reportMeta}>{bills || 0} active bills</Text>
      <Text style={styles.reportMeta}>{voided || 0} voided sales</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: MAIN_BOTTOM_NAV_HEIGHT + 40, gap: 14 },
  heroCard: { backgroundColor: salesColors.surface, borderRadius: 22, padding: 18, gap: 6, borderWidth: 1, borderColor: `${salesColors.outlineVariant}88` },
  heroEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: salesColors.primary },
  heroTitle: { fontSize: 28, fontWeight: '900', color: colors.slate, letterSpacing: -0.8 },
  heroBody: { fontSize: 14, lineHeight: 20, color: salesColors.textMuted },
  centered: { alignItems: 'center', gap: 10, paddingVertical: 30 },
  loadingText: { fontSize: 14, color: salesColors.textMuted },
  errorCard: { backgroundColor: `${salesColors.tertiaryContainer}55`, borderRadius: 16, padding: 14, gap: 10 },
  errorText: { fontSize: 13, lineHeight: 19, color: salesColors.terracotta, fontWeight: '600' },
  retryBtn: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: salesColors.white },
  retryBtnText: { fontSize: 12, fontWeight: '700', color: salesColors.terracotta },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  reportCard: { width: '48%', borderRadius: 18, padding: 16, backgroundColor: salesColors.primaryContainer, gap: 4 },
  reportCardWide: { width: '100%' },
  reportTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: salesColors.primary },
  reportRevenue: { marginTop: 8, fontSize: 24, fontWeight: '800', color: salesColors.text },
  reportMeta: { fontSize: 12, color: salesColors.textMuted },
  card: { backgroundColor: salesColors.surface, borderRadius: 18, padding: 16, gap: 12, borderWidth: 1, borderColor: `${salesColors.outlineVariant}88` },
  cardTitle: { fontSize: 18, fontWeight: '800', color: colors.slate },
  cardBody: { fontSize: 13, lineHeight: 19, color: salesColors.textMuted },
  recentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 4 },
  recentId: { fontSize: 14, fontWeight: '700', color: salesColors.text },
  recentMeta: { fontSize: 12, color: salesColors.textMuted },
  recentAmount: { fontSize: 14, fontWeight: '800', color: salesColors.primary },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { minWidth: '48%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: `${salesColors.primaryContainer}55`, borderWidth: 1, borderColor: salesColors.primaryContainer },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: salesColors.primary },
});
