import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, FAB, Snackbar } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { salesAPI } from '../../services/api';
import { COLORS } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import SearchBar from '../../components/SearchBar';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import LoadingSpinner from '../../components/LoadingSpinner';

const SalesListScreen = ({ navigation }) => {
  const { isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [message, setMessage] = useState('');

  const fetchSales = async () => {
    try {
      const res = await salesAPI.getAll({ search: search || undefined });
      setSales(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchSales(); }, [search]));

  const handleDelete = async () => {
    try {
      await salesAPI.delete(deleteId);
      setMessage('Sale deleted & stock restored'); setDeleteId(null); fetchSales();
    } catch (err) { setMessage(err.response?.data?.message || 'Delete failed'); setDeleteId(null); }
  };

  const renderSale = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('SaleDetails', { sale: item })}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <Text style={styles.name}>{item.product?.productName || 'N/A'}</Text>
            <Text style={styles.amount}>${item.totalAmount?.toFixed(2)}</Text>
          </View>
          <Text style={styles.batch}>Batch: {item.inventoryBatch?.batchNumber || 'N/A'} | Qty: {item.quantity}</Text>
          <View style={styles.row}>
            <Text style={styles.date}>{new Date(item.saleDate).toLocaleDateString()}</Text>
            {item.discountPercent > 0 && (
              <Text style={styles.discount}>{item.discountPercent}% OFF</Text>
            )}
          </View>
          {isAdmin() && (
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => setDeleteId(item._id)}>
                <Text style={styles.deleteBtn}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search sales..." />
      <FlatList data={sales} keyExtractor={item => item._id} renderItem={renderSale}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={<EmptyState message="No sales found" icon="cart-outline" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSales(); }} colors={[COLORS.primary]} />}
      />
      <FAB icon="plus" style={styles.fab} onPress={() => navigation.navigate('AddSale')} color={COLORS.white} />
      <ConfirmDialog visible={!!deleteId} title="Delete Sale" message="Delete this sale? Stock will be restored."
        onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={2000}>{message}</Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  card: { marginBottom: 12, borderRadius: 12, backgroundColor: COLORS.surface, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: COLORS.text, flex: 1 },
  amount: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  batch: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  date: { fontSize: 12, color: COLORS.textLight },
  discount: { fontSize: 12, fontWeight: '700', color: COLORS.accent },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  deleteBtn: { color: COLORS.error, fontWeight: '600', fontSize: 13 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: COLORS.primary, borderRadius: 28 },
});

export default SalesListScreen;
