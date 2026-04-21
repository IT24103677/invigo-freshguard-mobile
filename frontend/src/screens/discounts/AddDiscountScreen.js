import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { TextInput, Button, Snackbar } from 'react-native-paper';
import { discountsAPI } from '../../services/api';
import { COLORS } from '../../constants/config';

const AddDiscountScreen = ({ navigation }) => {
  const [form, setForm] = useState({ product: '', inventoryBatch: '', discountPercent: '', note: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const update = (k, v) => setForm({ ...form, [k]: v });

  const handleSubmit = async () => {
    if (!form.product) return setError('Product ID is required');
    const pct = parseFloat(form.discountPercent);
    if (!pct || pct < 0 || pct > 100) return setError('Discount must be between 0 and 100');

    setLoading(true);
    try {
      await discountsAPI.create({
        product: form.product,
        inventoryBatch: form.inventoryBatch || undefined,
        discountPercent: pct,
        note: form.note,
      });
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <TextInput label="Product ID *" value={form.product} onChangeText={v => update('product', v)}
        mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Batch ID (optional)" value={form.inventoryBatch} onChangeText={v => update('inventoryBatch', v)}
        mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Discount Percent *" value={form.discountPercent} onChangeText={v => update('discountPercent', v)}
        mode="outlined" style={styles.input} keyboardType="decimal-pad" outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Note" value={form.note} onChangeText={v => update('note', v)}
        mode="outlined" style={styles.input} multiline outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading}
        style={styles.btn} buttonColor={COLORS.primary} contentStyle={{ paddingVertical: 6 }}>
        Create Discount
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

export default AddDiscountScreen;
