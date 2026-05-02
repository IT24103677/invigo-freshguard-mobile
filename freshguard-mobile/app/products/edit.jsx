import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getProductById, updateProduct } from '../../src/api/products';

export default function EditProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    productName: '',
    mainCategory: '',
    subCategory: '',
    supplier: '',
    costPrice: '',
    sellingPrice: '',
    imageUrl: '',
    stock: '',
    sold: '',
  });

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await getProductById(id);
        setForm({
          productName: data.productName || '',
          mainCategory: data.mainCategory || '',
          subCategory: data.subCategory || '',
          supplier: data.supplier || '',
          costPrice: String(data.costPrice || ''),
          sellingPrice: String(data.sellingPrice || ''),
          imageUrl: data.imageUrl || '',
          stock: String(data.stock || ''),
          sold: String(data.sold || ''),
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to load product');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id]);

  const handleChange = (name, value) => {
    setForm({ ...form, [name]: value });
  };

  const validate = () => {
    if (!form.productName.trim()) {
      Alert.alert('Error', 'Product name is required');
      return false;
    }
    if (!form.mainCategory.trim()) {
      Alert.alert('Error', 'Main category is required');
      return false;
    }
    if (!form.subCategory.trim()) {
      Alert.alert('Error', 'Sub category is required');
      return false;
    }
    if (!form.supplier.trim()) {
      Alert.alert('Error', 'Supplier is required');
      return false;
    }
    if (!form.costPrice || isNaN(form.costPrice)) {
      Alert.alert('Error', 'Valid cost price is required');
      return false;
    }
    if (!form.sellingPrice || isNaN(form.sellingPrice)) {
      Alert.alert('Error', 'Valid selling price is required');
      return false;
    }
    if (Number(form.costPrice) > Number(form.sellingPrice)) {
      Alert.alert('Error', 'Cost price cannot exceed selling price');
      return false;
    }
    if (!form.stock || isNaN(form.stock)) {
      Alert.alert('Error', 'Valid stock quantity is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      await updateProduct(id, {
        productName: form.productName.trim(),
        mainCategory: form.mainCategory.trim(),
        subCategory: form.subCategory.trim(),
        supplier: form.supplier.trim(),
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        imageUrl: form.imageUrl.trim(),
        stock: Number(form.stock),
        sold: Number(form.sold) || 0,
      });
      Alert.alert('Success', 'Product updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007A5E" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Edit Product</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>

        <Text style={styles.label}>Product Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Fresh Milk 1L"
          value={form.productName}
          onChangeText={(v) => handleChange('productName', v)}
        />

        <Text style={styles.label}>Main Category *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Beverages"
          value={form.mainCategory}
          onChangeText={(v) => handleChange('mainCategory', v)}
        />

        <Text style={styles.label}>Sub Category *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Milk Drinks"
          value={form.subCategory}
          onChangeText={(v) => handleChange('subCategory', v)}
        />

        <Text style={styles.label}>Supplier *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Highland Dairy"
          value={form.supplier}
          onChangeText={(v) => handleChange('supplier', v)}
        />

        <Text style={styles.label}>Cost Price (Rs) *</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          keyboardType="numeric"
          value={form.costPrice}
          onChangeText={(v) => handleChange('costPrice', v)}
        />

        <Text style={styles.label}>Selling Price (Rs) *</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          keyboardType="numeric"
          value={form.sellingPrice}
          onChangeText={(v) => handleChange('sellingPrice', v)}
        />

        <Text style={styles.label}>Stock Quantity *</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          keyboardType="numeric"
          value={form.stock}
          onChangeText={(v) => handleChange('stock', v)}
        />

        <Text style={styles.label}>Sold</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          keyboardType="numeric"
          value={form.sold}
          onChangeText={(v) => handleChange('sold', v)}
        />

        <Text style={styles.label}>Image URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://..."
          value={form.imageUrl}
          onChangeText={(v) => handleChange('imageUrl', v)}
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Update Product</Text>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#007A5E',
    padding: 20,
    paddingTop: 50,
  },
  backText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  headerText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  submitButton: {
    backgroundColor: '#007A5E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  cancelText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 16,
  },
});