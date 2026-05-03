import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { Text, Card, Button, List, IconButton, Divider } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { dashboardAPI } from '../services/api';
import { COLORS } from '../constants/config';
import LoadingSpinner from '../components/LoadingSpinner';
import StatCard from '../components/StatCard';

const screenWidth = Dimensions.get("window").width;

const DashboardScreen = () => {
  const navigation = useNavigation();
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [salesChart, setSalesChart] = useState(null);
  const [stockChart, setStockChart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [sumRes, alertRes, salesRes, stockRes] = await Promise.all([
        dashboardAPI.getSummary(),
        dashboardAPI.getAlerts(),
        dashboardAPI.getSalesChart(),
        dashboardAPI.getStockChart()
      ]);
      setSummary(sumRes.data);
      setAlerts(alertRes.data);
      setSalesChart(salesRes.data);
      setStockChart(stockRes.data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const markAlertAsRead = async (id) => {
    try {
      await dashboardAPI.markAsRead(id);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const clearAllAlerts = async () => {
    try {
      await dashboardAPI.clearAll();
      fetchData();
    } catch (err) { console.error(err); }
  };

  if (loading) return <LoadingSpinner message="Loading Dashboard..." />;

  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    color: (opacity = 1) => `rgba(0, 122, 94, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>INVIGO Smart Dashboard</Text>
        <Text style={styles.headerSubtitle}>Real-time system health</Text>
      </View>

      <View style={styles.content}>
        {/* Summary Cards */}
        <View style={styles.row}>
          <StatCard title="Products" value={summary?.totalProducts || 0} color={COLORS.primary} flex={1} />
          <StatCard title="Total Stock" value={summary?.totalStockQty || 0} color={COLORS.info} flex={1} />
        </View>
        <View style={styles.row}>
          <StatCard title="Near Expiry" value={summary?.nearExpiryCount || 0} color={COLORS.warning} flex={1} />
          <StatCard title="Expired" value={summary?.expiredCount || 0} color={COLORS.error} flex={1} />
        </View>
        <View style={styles.row}>
          <StatCard title="Today Sales" value={summary?.todaySalesQty || 0} color={COLORS.success} flex={1}
            subtitle={`$${(summary?.todayRevenue || 0).toFixed(2)}`} />
          <StatCard title="Total Revenue" value={`$${(summary?.totalRevenue || 0).toFixed(0)}`} color={COLORS.secondary} flex={1} />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
            <Button mode="contained" onPress={() => navigation.navigate('Products')} style={styles.actionBtn}>+ Product</Button>
            <Button mode="contained" onPress={() => navigation.navigate('Discounts')} style={styles.actionBtn}>% Discount</Button>
            <Button mode="contained" onPress={() => navigation.navigate('Inventory')} style={styles.actionBtn}>+ Stock</Button>
            <Button mode="contained" onPress={() => navigation.navigate('Sales')} style={styles.actionBtn}>$ Sale</Button>
        </View>

        {/* Alerts Section */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            {alerts.length > 0 && <Button onPress={clearAllAlerts}>Clear All</Button>}
        </View>
        <Card style={styles.alertsCard}>
          {alerts.length === 0 ? (
            <Card.Content><Text style={styles.emptyText}>No active alerts</Text></Card.Content>
          ) : (
            alerts.map((alert, index) => (
              <React.Fragment key={alert._id}>
                <List.Item
                  title={alert.message}
                  description={new Date(alert.createdAt).toLocaleString()}
                  left={props => <List.Icon {...props} icon="alert-circle" color={alert.isRead ? COLORS.textLight : COLORS.warning} />}
                  right={props => !alert.isRead && <IconButton {...props} icon="check" onPress={() => markAlertAsRead(alert._id)} />}
                  titleNumberOfLines={2}
                />
                {index < alerts.length - 1 && <Divider />}
              </React.Fragment>
            ))
          )}
        </Card>

        {/* Charts */}
        <Text style={styles.sectionTitle}>Sales (Last 7 Days)</Text>
        {salesChart && (
          <LineChart
            data={{
              labels: salesChart.map(s => s.date.split('-')[2]), // Just day
              datasets: [{ data: salesChart.map(s => s.amount) }]
            }}
            width={screenWidth - 32}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        )}

        <Text style={styles.sectionTitle}>Stock by Category</Text>
        {stockChart && (
          <BarChart
            data={{
              labels: stockChart.map(s => s.category.slice(0, 5)),
              datasets: [{ data: stockChart.map(s => s.stock) }]
            }}
            width={screenWidth - 32}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            yAxisLabel=""
            yAxisSuffix=""
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.secondary, padding: 20, paddingTop: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.white },
  headerSubtitle: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },
  content: { padding: 16 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.secondary, marginVertical: 12 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  actionBtn: { borderRadius: 8, flex: 1, minWidth: '45%' },
  alertsCard: { borderRadius: 12, backgroundColor: COLORS.surface, elevation: 2, marginBottom: 20 },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, padding: 20 },
  chart: { marginVertical: 8, borderRadius: 16 },
});

export default DashboardScreen;
