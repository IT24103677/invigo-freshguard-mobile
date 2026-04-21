import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { TextInput, Button, Snackbar, Text } from 'react-native-paper';
import { salesAPI, productsAPI, inventoryAPI } from '../../services/api';
import { COLORS } from '../../constants/config';

const AddSaleScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState({ product: '', inventoryBatch: '', quantity: '', saleDate: new Date().toISOString().split('T')[0] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedBatchInfo, setSelectedBatchInfo] = useState(null);

  useEffect(() => {
    productsAPI.getAll().then(res => setProducts(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (form.product) {
      inventoryAPI.getAvailableBatches(form.product)
        .then(res => setBatches(res.data))
        .catch(console.error);
    }
  }, [form.product]);

  useEffect(() => {
    if (form.inventoryBatch) {
      const batch = batches.find(b => b._id === form.inventoryBatch);
      setSelectedBatchInfo(batch);
    }
  }, [form.inventoryBatch]);

  const update = (k, v) => setForm({ ...form, [k]: v });

  const handleSubmit = async () => {
    if (!form.product) return setError('Product ID is required');
    if (!form.inventoryBatch) return setError('Batch ID is required');
    if (!form.quantity || parseInt(form.quantity) < 1) return setError('Quantity must be at least 1');

    setLoading(true);
    try {
      await salesAPI.create({
        product: form.product,
        inventoryBatch: form.inventoryBatch,
        quantity: parseInt(form.quantity),
        saleDate: form.saleDate,
      });
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record sale');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <TextInput label="Product ID *" value={form.product} onChangeText={v => update('product', v)}
        mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

      <TextInput label="Batch ID *" value={form.inventoryBatch} onChangeText={v => update('inventoryBatch', v)}
        mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

      {selectedBatchInfo && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Batch: {selectedBatchInfo.batchNumber} | Available: {selectedBatchInfo.quantity}</Text>
          <Text style={styles.infoText}>Expiry: {new Date(selectedBatchInfo.expiryDate).toLocaleDateString()}</Text>
        </View>
      )}

      <TextInput label="Quantity *" value={form.quantity} onChangeText={v => update('quantity', v)}
        mode="outlined" style={styles.input} keyboardType="number-pad" outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Sale Date (YYYY-MM-DD)" value={form.saleDate} onChangeText={v => update('saleDate', v)}
        mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

      <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading}
        style={styles.btn} buttonColor={COLORS.primary} contentStyle={{ paddingVertical: 6 }}>
        Record Sale
      </Button>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000} style={{ backgroundColor: COLORS.error }}>
        {error}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  input: { marginBottom: 12, backgroundColor: COLORS.surface },
  btn: { borderRadius: 12, marginTop: 8, marginBottom: 32 },
  infoBox: { backgroundColor: COLORS.primary + '10', padding: 12, borderRadius: 8, marginBottom: 12 },
  infoText: { fontSize: 12, color: COLORS.primary },
});

export default AddSaleScreen;
