import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { TextInput, Button, Snackbar } from 'react-native-paper';
import { productsAPI } from '../../services/api';
import { COLORS } from '../../constants/config';

const AddProductScreen = ({ navigation }) => {
  const [form, setForm] = useState({
    productName: '', productCode: '', mainCategory: '', subCategory: '',
    itemType: '', supplier: '', costPrice: '', sellingPrice: '',
    description: '', barcode: '', reorderLevel: '10',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (k, v) => setForm({ ...form, [k]: v });

  const handleSubmit = async () => {
    if (!form.productName.trim()) return setError('Product name is required');
    if (!form.productCode.trim()) return setError('Product code is required');
    if (!form.mainCategory.trim()) return setError('Category is required');
    if (!form.supplier.trim()) return setError('Supplier is required');
    if (!form.costPrice || parseFloat(form.costPrice) < 0) return setError('Valid cost price required');
    if (!form.sellingPrice || parseFloat(form.sellingPrice) < 0) return setError('Valid selling price required');

    setLoading(true);
    try {
      await productsAPI.create({
        ...form,
        costPrice: parseFloat(form.costPrice),
        sellingPrice: parseFloat(form.sellingPrice),
        reorderLevel: parseInt(form.reorderLevel) || 10,
      });
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create product');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <TextInput label="Product Name *" value={form.productName} onChangeText={v => update('productName', v)}
        mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Product Code *" value={form.productCode} onChangeText={v => update('productCode', v)}
        mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Main Category *" value={form.mainCategory} onChangeText={v => update('mainCategory', v)}
        mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Sub Category *" value={form.subCategory} onChangeText={v => update('subCategory', v)}
        mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Item Type *" value={form.itemType} onChangeText={v => update('itemType', v)}
        mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Supplier *" value={form.supplier} onChangeText={v => update('supplier', v)}
        mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Cost Price *" value={form.costPrice} onChangeText={v => update('costPrice', v)}
        mode="outlined" style={styles.input} keyboardType="decimal-pad" outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Selling Price *" value={form.sellingPrice} onChangeText={v => update('sellingPrice', v)}
        mode="outlined" style={styles.input} keyboardType="decimal-pad" outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Description" value={form.description} onChangeText={v => update('description', v)}
        mode="outlined" style={styles.input} multiline outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Barcode" value={form.barcode} onChangeText={v => update('barcode', v)}
        mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      <TextInput label="Reorder Level" value={form.reorderLevel} onChangeText={v => update('reorderLevel', v)}
        mode="outlined" style={styles.input} keyboardType="number-pad" outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

      <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading}
        style={styles.btn} buttonColor={COLORS.primary} contentStyle={{ paddingVertical: 6 }}>
        Add Product
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

export default AddProductScreen;
