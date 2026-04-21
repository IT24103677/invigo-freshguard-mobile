import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { TextInput, Button, Snackbar } from 'react-native-paper';
import { inventoryAPI, productsAPI } from '../../services/api';
import { COLORS } from '../../constants/config';

const AddInventoryScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ product: '', batchNumber: '', quantity: '', expiryDate: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    productsAPI.getAll().then(res => setProducts(res.data)).catch(console.error);
  }, []);

  const update = (k, v) => setForm({ ...form, [k]: v });

  const handleSubmit = async () => {
    if (!form.product) return setError('Please enter a Product ID');
    if (!form.batchNumber.trim()) return setError('Batch number is required');
    if (!form.quantity || parseInt(form.quantity) < 1) return setError('Quantity must be at least 1');
    if (!form.expiryDate) return setError('Expiry date is required (YYYY-MM-DD)');

    setLoading(true);
    try {
      await inventoryAPI.create({
        product: form.product,
        batchNumber: form.batchNumber.trim(),
        quantity: parseInt(form.quantity),
        expiryDate: form.expiryDate,
      });
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add batch');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <TextInput label="Product ID *" value={form.product} onChangeText={v => update('product', v)}
        mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary}
        placeholder="Paste product _id here" />
      <TextInput label="Batch Number *" value={form.batchNumber} onChangeText={v => update('batchNumber', v)}
        mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Quantity *" value={form.quantity} onChangeText={v => update('quantity', v)}
        mode="outlined" style={styles.input} keyboardType="number-pad" outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Expiry Date (YYYY-MM-DD) *" value={form.expiryDate} onChangeText={v => update('expiryDate', v)}
        mode="outlined" style={styles.input} placeholder="2026-12-31" outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

      <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading}
        style={styles.btn} buttonColor={COLORS.primary} contentStyle={{ paddingVertical: 6 }}>
        Add Stock Batch
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
});

export default AddInventoryScreen;
