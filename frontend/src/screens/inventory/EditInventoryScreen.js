import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { TextInput, Button, Snackbar } from 'react-native-paper';
import { inventoryAPI } from '../../services/api';
import { COLORS } from '../../constants/config';

const EditInventoryScreen = ({ route, navigation }) => {
  const { item } = route.params;
  const [form, setForm] = useState({
    product: item.product?._id || item.product || '',
    batchNumber: item.batchNumber || '',
    quantity: String(item.quantity || ''),
    expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const update = (k, v) => setForm({ ...form, [k]: v });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await inventoryAPI.update(item._id, {
        product: form.product,
        batchNumber: form.batchNumber.trim(),
        quantity: parseInt(form.quantity),
        expiryDate: form.expiryDate,
      });
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <TextInput label="Product ID" value={form.product} onChangeText={v => update('product', v)}
        mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Batch Number" value={form.batchNumber} onChangeText={v => update('batchNumber', v)}
        mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Quantity" value={form.quantity} onChangeText={v => update('quantity', v)}
        mode="outlined" style={styles.input} keyboardType="number-pad" outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Expiry Date (YYYY-MM-DD)" value={form.expiryDate} onChangeText={v => update('expiryDate', v)}
        mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading}
        style={styles.btn} buttonColor={COLORS.primary} contentStyle={{ paddingVertical: 6 }}>
        Update Batch
      </Button>
      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000} style={{ backgroundColor: COLORS.error }}>{error}</Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  input: { marginBottom: 12, backgroundColor: COLORS.surface },
  btn: { borderRadius: 12, marginTop: 8, marginBottom: 32 },
});

export default EditInventoryScreen;
