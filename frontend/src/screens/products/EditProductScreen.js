import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { TextInput, Button, Snackbar } from 'react-native-paper';
import { productsAPI } from '../../services/api';
import { COLORS } from '../../constants/config';

const EditProductScreen = ({ route, navigation }) => {
  const { product } = route.params;
  const [form, setForm] = useState({
    productName: product.productName || '',
    productCode: product.productCode || '',
    mainCategory: product.mainCategory || '',
    subCategory: product.subCategory || '',
    itemType: product.itemType || '',
    supplier: product.supplier || '',
    costPrice: String(product.costPrice || ''),
    sellingPrice: String(product.sellingPrice || ''),
    description: product.description || '',
    barcode: product.barcode || '',
    reorderLevel: String(product.reorderLevel || 10),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (k, v) => setForm({ ...form, [k]: v });

  const handleSubmit = async () => {
    if (!form.productName.trim()) return setError('Product name is required');
    if (!form.productCode.trim()) return setError('Product code is required');

    setLoading(true);
    try {
      await productsAPI.update(product._id, {
        ...form,
        costPrice: parseFloat(form.costPrice),
        sellingPrice: parseFloat(form.sellingPrice),
        reorderLevel: parseInt(form.reorderLevel) || 10,
      });
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <TextInput label="Product Name *" value={form.productName} onChangeText={v => update('productName', v)}
        mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      
      <TextInput label="Product Category" value={form.mainCategory} onChangeText={v => update('mainCategory', v)}
        mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      
      <TextInput label="Cost Price ($)" value={form.costPrice} onChangeText={v => update('costPrice', v)}
        mode="outlined" style={styles.input} keyboardType="decimal-pad" outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
      
      <TextInput label="Selling Price ($)" value={form.sellingPrice} onChangeText={v => update('sellingPrice', v)}
        mode="outlined" style={styles.input} keyboardType="decimal-pad" outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

      <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading}
        style={styles.btn} buttonColor={COLORS.primary} contentStyle={{ paddingVertical: 6 }}>
        Update Product
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

export default EditProductScreen;
