import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, FAB, Snackbar, Chip } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { productsAPI } from '../../services/api';
import { COLORS } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import SearchBar from '../../components/SearchBar';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import LoadingSpinner from '../../components/LoadingSpinner';

const ProductListScreen = ({ navigation }) => {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [message, setMessage] = useState('');

  const fetchProducts = async () => {
    try {
      const res = await productsAPI.getAll({ search: search || undefined });
      setProducts(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchProducts(); }, [search]));

  const handleDelete = async () => {
    try {
      await productsAPI.delete(deleteId);
      setMessage('Product deleted');
      setDeleteId(null);
      fetchProducts();
    } catch (err) { setMessage(err.response?.data?.message || 'Delete failed'); setDeleteId(null); }
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('ProductDetails', { product: item })}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{item.productName}</Text>
              <Text style={styles.productCode}>{item.productCode}</Text>
            </View>
            <Chip style={styles.categoryChip} textStyle={styles.categoryText}>{item.mainCategory}</Chip>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.price}>Cost: ${item.costPrice?.toFixed(2)}</Text>
            <Text style={[styles.price, { color: COLORS.primary }]}>Sell: ${item.sellingPrice?.toFixed(2)}</Text>
          </View>
          <Text style={styles.supplier}>Supplier: {item.supplier}</Text>
          {isAdmin() && (
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => navigation.navigate('EditProduct', { product: item })}>
                <Text style={styles.editBtn}>Edit</Text>
              </TouchableOpacity>
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
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search products..." />
      <FlatList
        data={products}
        keyExtractor={item => item._id}
        renderItem={renderProduct}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={<EmptyState message="No products found" icon="package-variant" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProducts(); }} colors={[COLORS.primary]} />}
      />
      {isAdmin() && (
        <FAB icon="plus" style={styles.fab} onPress={() => navigation.navigate('AddProduct')} color={COLORS.white} />
      )}
      <ConfirmDialog visible={!!deleteId} title="Delete Product" message="Are you sure you want to delete this product?"
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
  productCode: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  categoryChip: { backgroundColor: COLORS.primary + '20' },
  categoryText: { fontSize: 11, color: COLORS.primary },
  priceRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  price: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  supplier: { fontSize: 12, color: COLORS.textLight, marginTop: 6 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 12 },
  editBtn: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  deleteBtn: { color: COLORS.error, fontWeight: '600', fontSize: 13 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: COLORS.primary, borderRadius: 28 },
});

export default ProductListScreen;
