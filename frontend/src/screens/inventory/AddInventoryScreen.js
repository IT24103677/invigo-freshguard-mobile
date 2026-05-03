import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, FlatList } from 'react-native';
import { TextInput, Button, Snackbar, Portal, Modal, Text, Divider, List, IconButton, TouchableRipple } from 'react-native-paper';
import { inventoryAPI, productsAPI } from '../../services/api';
import { COLORS } from '../../constants/config';

const AddInventoryScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ product: '', batchNumber: '', quantity: '', expiryDate: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    productsAPI.getAll().then(res => setProducts(res.data)).catch(console.error);
  }, []);

  const update = (k, v) => setForm({ ...form, [k]: v });

  const handleSubmit = async () => {
    if (!form.product || !form.batchNumber || !form.quantity || !form.expiryDate) {
      return setError('Please fill all required fields');
    }

    setLoading(true);
    try {
      await inventoryAPI.create({
        ...form,
        quantity: parseInt(form.quantity),
      });
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add inventory');
    } finally { setLoading(false); }
  };

  const selectedProduct = products.find(p => p._id === form.product);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.selectContainer}>
          <TextInput
            label="Select Product *"
            value={selectedProduct?.productName || ''}
            mode="outlined"
            editable={false}
            right={<TextInput.Icon icon="chevron-down" />}
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
            style={{ backgroundColor: COLORS.surface }}
          />
          <TouchableRipple
            onPress={() => setModalVisible(true)}
            style={styles.touchOverlay}
            rippleColor="rgba(0, 0, 0, .1)"
          >
            <View />
          </TouchableRipple>
        </View>

        <TextInput label="Batch Number *" value={form.batchNumber} onChangeText={v => update('batchNumber', v)}
          mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
        
        <TextInput label="Quantity *" value={form.quantity} onChangeText={v => update('quantity', v)}
          mode="outlined" style={styles.input} keyboardType="number-pad" outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
        
        <TextInput label="Expiry Date (YYYY-MM-DD) *" value={form.expiryDate} onChangeText={v => update('expiryDate', v)}
          mode="outlined" style={styles.input} placeholder="e.g. 2026-12-31" outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

        <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading}
          style={styles.btn} buttonColor={COLORS.primary} contentStyle={{ paddingVertical: 6 }}>
          Add Stock Batch
        </Button>

        <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000} style={{ backgroundColor: COLORS.error }}>{error}</Snackbar>
      </ScrollView>

      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Product</Text>
            <IconButton icon="close" onPress={() => setModalVisible(false)} />
          </View>
          <Divider />
          <FlatList
            data={products}
            keyExtractor={item => item._id}
            renderItem={({ item }) => (
              <List.Item
                title={item.productName}
                onPress={() => {
                  update('product', item._id);
                  setModalVisible(false);
                }}
                right={props => form.product === item._id && <List.Icon {...props} icon="check" color={COLORS.primary} />}
              />
            )}
            style={{ maxHeight: 400 }}
          />
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  selectContainer: { marginBottom: 12, position: 'relative' },
  touchOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 4, zIndex: 1 },
  input: { marginBottom: 12, backgroundColor: COLORS.surface },
  btn: { borderRadius: 12, marginTop: 8, marginBottom: 32 },
  modalContent: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
});

export default AddInventoryScreen;
