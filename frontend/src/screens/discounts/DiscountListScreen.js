import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, FAB, Snackbar, Chip, Switch } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { discountsAPI } from '../../services/api';
import { COLORS } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import LoadingSpinner from '../../components/LoadingSpinner';

const DiscountListScreen = ({ navigation }) => {
  const { isAdmin } = useAuth();
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [message, setMessage] = useState('');

  const fetch = async () => {
    try { const res = await discountsAPI.getAll(); setDiscounts(res.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetch(); }, []));

  const toggleActive = async (id) => {
    try { await discountsAPI.toggle(id); fetch(); }
    catch (err) { setMessage(err.response?.data?.message || 'Toggle failed'); }
  };

  const handleDelete = async () => {
    try { await discountsAPI.delete(deleteId); setMessage('Discount deleted'); setDeleteId(null); fetch(); }
    catch (err) { setMessage(err.response?.data?.message || 'Delete failed'); setDeleteId(null); }
  };

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.product?.productName || 'N/A'}</Text>
            {item.inventoryBatch && <Text style={styles.batch}>Batch: {item.inventoryBatch.batchNumber}</Text>}
          </View>
          <Text style={styles.percent}>{item.discountPercent}%</Text>
        </View>
        {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
        <View style={styles.footer}>
          <Chip style={{ backgroundColor: item.active ? COLORS.safe + '20' : COLORS.error + '20' }}
            textStyle={{ color: item.active ? COLORS.safe : COLORS.error, fontSize: 11 }}>
            {item.active ? 'Active' : 'Inactive'}
          </Chip>
          {isAdmin() && (
            <View style={styles.actions}>
              <Switch value={item.active} onValueChange={() => toggleActive(item._id)} color={COLORS.primary} />
              <TouchableOpacity onPress={() => setDeleteId(item._id)}>
                <Text style={styles.deleteBtn}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <FlatList data={discounts} keyExtractor={item => item._id} renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={<EmptyState message="No discounts" icon="tag-outline" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} colors={[COLORS.primary]} />}
      />
      {isAdmin() && <FAB icon="plus" style={styles.fab} onPress={() => navigation.navigate('AddDiscount')} color={COLORS.white} />}
      <ConfirmDialog visible={!!deleteId} title="Delete Discount" message="Delete this discount?"
        onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={2000}>{message}</Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  card: { marginBottom: 12, borderRadius: 12, backgroundColor: COLORS.surface, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  batch: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  percent: { fontSize: 24, fontWeight: '800', color: COLORS.accent },
  note: { fontSize: 12, color: COLORS.textLight, marginTop: 6, fontStyle: 'italic' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deleteBtn: { color: COLORS.error, fontWeight: '600', fontSize: 13 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: COLORS.primary, borderRadius: 28 },
});

export default DiscountListScreen;
