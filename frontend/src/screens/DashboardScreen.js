import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { reportsAPI } from '../services/api';
import { COLORS } from '../constants/config';
import LoadingSpinner from '../components/LoadingSpinner';
import StatCard from '../components/StatCard';

const DashboardScreen = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const response = await reportsAPI.getDashboard();
      setData(response.data);
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchDashboard(); }, []));

  const onRefresh = () => { setRefreshing(true); fetchDashboard(); };

  if (loading) return <LoadingSpinner message="Loading Dashboard..." />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>INVIGO Dashboard</Text>
        <Text style={styles.headerSubtitle}>Real-time inventory overview</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.row}>
          <View style={styles.halfCard}>
            <StatCard title="Total Products" value={data?.totalProducts || 0} color={COLORS.primary} />
          </View>
          <View style={styles.halfCard}>
            <StatCard title="Total Batches" value={data?.totalBatches || 0} color={COLORS.info} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfCard}>
            <StatCard title="Total Stock" value={data?.totalStockQty || 0} color={COLORS.success} />
          </View>
          <View style={styles.halfCard}>
            <StatCard title="Low Stock" value={data?.lowStockBatches || 0} color={COLORS.warning} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfCard}>
            <StatCard title="Expired" value={data?.expiredBatches || 0} color={COLORS.error} />
          </View>
          <View style={styles.halfCard}>
            <StatCard title="Expiring Soon" value={data?.expiringSoonBatches || 0} color={COLORS.accent} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfCard}>
            <StatCard title="Sales Today" value={data?.salesTodayQty || 0} color={COLORS.info}
              subtitle={`$${(data?.salesTodayAmount || 0).toFixed(2)}`} />
          </View>
          <View style={styles.halfCard}>
            <StatCard title="Active Discounts" value={data?.activeDiscounts || 0} color={COLORS.primaryLight} />
          </View>
        </View>

        <Card style={styles.revenueCard}>
          <Card.Content style={{ alignItems: 'center', paddingVertical: 20 }}>
            <Text style={styles.revenueLabel}>Total Revenue</Text>
            <Text style={styles.revenueValue}>${(data?.totalRevenue || 0).toFixed(2)}</Text>
            <Text style={styles.revenueSubtext}>{data?.totalSalesCount || 0} total sales</Text>
          </Card.Content>
        </Card>

        <StatCard title="Unread Alerts" value={data?.unreadAlerts || 0} color={COLORS.warning} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.secondary, padding: 20, paddingTop: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.white },
  headerSubtitle: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },
  grid: { padding: 16 },
  row: { flexDirection: 'row', gap: 12 },
  halfCard: { flex: 1 },
  revenueCard: {
    backgroundColor: COLORS.primary, borderRadius: 16, marginBottom: 12, elevation: 4,
  },
  revenueLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  revenueValue: { fontSize: 36, fontWeight: '800', color: COLORS.white, marginTop: 4 },
  revenueSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
});

export default DashboardScreen;
