import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Chip, Button, Snackbar } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { alertsAPI } from '../../services/api';
import { COLORS } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';

const typeColors = { EXPIRING_SOON: COLORS.expiringSoon, EXPIRED: COLORS.expired, LOW_STOCK: COLORS.warning };

const AlertsScreen = () => {
  const { isAdmin } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');

  const fetch = async () => {
    try { const res = await alertsAPI.getAll(); setAlerts(res.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetch(); }, []));

  const markRead = async (id) => {
    try { await alertsAPI.markAsRead(id); fetch(); }
    catch (err) { console.error(err); }
  };

  const generateAlerts = async () => {
    try {
      const res = await alertsAPI.generate();
      setMessage(res.data.message);
      fetch();
    } catch (err) { setMessage(err.response?.data?.message || 'Failed'); }
  };

  const renderItem = ({ item }) => {
    const color = typeColors[item.alertType] || COLORS.info;
    return (
      <Card style={[styles.card, !item.isRead && { borderLeftColor: color, borderLeftWidth: 4 }]}>
        <Card.Content>
          <View style={styles.header}>
            <Chip style={{ backgroundColor: color + '20' }} textStyle={{ color, fontSize: 10, fontWeight: '700' }}>
              {item.alertType?.replace(/_/g, ' ')}
            </Chip>
            {!item.isRead && (
              <TouchableOpacity onPress={() => markRead(item._id)}>
                <Text style={styles.markRead}>Mark Read</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.message}>{item.message}</Text>
          {item.suggestedDiscount && (
            <Text style={styles.suggestion}>Suggested Discount: {item.suggestedDiscount}%</Text>
          )}
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
        </Card.Content>
      </Card>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      {isAdmin() && (
        <Button mode="outlined" onPress={generateAlerts} style={styles.genBtn} textColor={COLORS.primary}
          icon="bell-ring-outline">
          Generate Alerts
        </Button>
      )}
      <FlatList data={alerts} keyExtractor={item => item._id} renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<EmptyState message="No alerts" icon="bell-check-outline" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} colors={[COLORS.primary]} />}
      />
      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={3000}>{message}</Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  genBtn: { margin: 16, marginBottom: 0, borderColor: COLORS.primary, borderRadius: 12 },
  card: { marginBottom: 12, borderRadius: 12, backgroundColor: COLORS.surface, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  message: { fontSize: 14, color: COLORS.text, marginTop: 10, lineHeight: 20 },
  suggestion: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 6 },
  date: { fontSize: 11, color: COLORS.textLight, marginTop: 8 },
  markRead: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
});

export default AlertsScreen;
