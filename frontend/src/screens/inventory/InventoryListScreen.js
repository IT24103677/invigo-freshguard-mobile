import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, FAB, Snackbar, Chip } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { inventoryAPI } from '../../services/api';
import { COLORS } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import SearchBar from '../../components/SearchBar';
import FilterChips from '../../components/FilterChips';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import LoadingSpinner from '../../components/LoadingSpinner';

const statusColors = { 'Expired': COLORS.expired, 'Expiring Soon': COLORS.expiringSoon, 'Safe': COLORS.safe };

const InventoryListScreen = ({ navigation }) => {
  const { isAdmin } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [message, setMessage] = useState('');

  const fetchInventory = async () => {
    try {
      const res = await inventoryAPI.getAll({ search: search || undefined, status: statusFilter || undefined });
      setInventory(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchInventory(); }, [search, statusFilter]));

  const handleDelete = async () => {
    try {
      await inventoryAPI.delete(deleteId);
      setMessage('Batch deleted'); setDeleteId(null); fetchInventory();
    } catch (err) { setMessage(err.response?.data?.message || 'Delete failed'); setDeleteId(null); }
  };

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>{item.product?.productName || 'Unknown'}</Text>
            <Text style={styles.batch}>Batch: {item.batchNumber}</Text>
          </View>
          <Chip style={{ backgroundColor: (statusColors[item.status] || COLORS.safe) + '20' }}
            textStyle={{ color: statusColors[item.status] || COLORS.safe, fontSize: 11, fontWeight: '700' }}>
            {item.status}
          </Chip>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detail}>Qty: <Text style={{ fontWeight: '700' }}>{item.quantity}</Text></Text>
          <Text style={styles.detail}>Expiry: {new Date(item.expiryDate).toLocaleDateString()}</Text>
        </View>
        {isAdmin() && (
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => navigation.navigate('EditInventory', { item })}>
              <Text style={styles.editBtn}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDeleteId(item._id)}>
              <Text style={styles.deleteBtn}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search inventory..." />
      <FilterChips
        options={[
          { label: 'All', value: null }, { label: 'Safe', value: 'Safe' },
          { label: 'Expiring Soon', value: 'Expiring Soon' }, { label: 'Expired', value: 'Expired' },
        ]}
        selected={statusFilter}
        onSelect={setStatusFilter}
      />
      <FlatList data={inventory} keyExtractor={item => item._id} renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={<EmptyState message="No inventory found" icon="warehouse" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchInventory(); }} colors={[COLORS.primary]} />}
      />
      <FAB icon="plus" style={styles.fab} onPress={() => navigation.navigate('AddInventory')} color={COLORS.white} />
      <ConfirmDialog visible={!!deleteId} title="Delete Batch" message="Delete this inventory batch?"
        onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={2000}>{message}</Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  card: { marginBottom: 12, borderRadius: 12, backgroundColor: COLORS.surface, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  batch: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  detail: { fontSize: 13, color: COLORS.textSecondary },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 10 },
  editBtn: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  deleteBtn: { color: COLORS.error, fontWeight: '600', fontSize: 13 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: COLORS.primary, borderRadius: 28 },
});

export default InventoryListScreen;
