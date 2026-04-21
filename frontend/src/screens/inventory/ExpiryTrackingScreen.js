import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { inventoryAPI } from '../../services/api';
import { COLORS } from '../../constants/config';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const ExpiryTrackingScreen = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async () => {
    try {
      const res = await inventoryAPI.getAll();
      // Show only non-safe items
      const atRisk = res.data.filter(i => i.status !== 'Safe');
      setItems(atRisk);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetch(); }, []));

  const renderItem = ({ item }) => {
    const isExpired = item.status === 'Expired';
    const color = isExpired ? COLORS.expired : COLORS.expiringSoon;
    const daysLeft = Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));

    return (
      <Card style={[styles.card, { borderLeftColor: color, borderLeftWidth: 4 }]}>
        <Card.Content>
          <Text style={styles.name}>{item.product?.productName}</Text>
          <Text style={styles.batch}>Batch: {item.batchNumber}</Text>
          <View style={styles.row}>
            <Chip style={{ backgroundColor: color + '20' }} textStyle={{ color, fontSize: 11, fontWeight: '700' }}>
              {isExpired ? `Expired ${Math.abs(daysLeft)} days ago` : `${daysLeft} days left`}
            </Chip>
            <Text style={styles.qty}>Qty: {item.quantity}</Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <FlatList data={items} keyExtractor={item => item._id} renderItem={renderItem}
      contentContainerStyle={{ padding: 16 }}
      ListEmptyComponent={<EmptyState message="No expiry issues found" icon="check-circle" />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} />}
    />
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: 12, borderRadius: 12, backgroundColor: COLORS.surface, elevation: 2 },
  name: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  batch: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  qty: { fontSize: 14, fontWeight: '600', color: COLORS.text },
});

export default ExpiryTrackingScreen;
