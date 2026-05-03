import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, FlatList } from 'react-native';
import { TextInput, Button, Snackbar, Portal, Modal, Text, Divider, List, IconButton, TouchableRipple } from 'react-native-paper';
import { discountsAPI, productsAPI, inventoryAPI } from '../../services/api';
import { COLORS } from '../../constants/config';

const AddDiscountScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState({ product: '', inventoryBatch: '', discountPercent: '', note: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [prodModalVisible, setProdModalVisible] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);

  useEffect(() => {
    productsAPI.getAll().then(res => setProducts(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (form.product) {
      inventoryAPI.getAvailableBatches(form.product)
        .then(res => setBatches(res.data))
        .catch(console.error);
    } else {
      setBatches([]);
    }
  }, [form.product]);

  const update = (k, v) => setForm({ ...form, [k]: v });

  const handleSubmit = async () => {
    if (!form.product) return setError('Please select a product');
    const pct = parseFloat(form.discountPercent);
    if (isNaN(pct) || pct < 0 || pct > 100) return setError('Discount must be between 0 and 100');

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
      setError(err.response?.data?.message || 'Failed to create discount');
    } finally { setLoading(false); }
  };

  const selectedProduct = products.find(p => p._id === form.product);
  const selectedBatch = batches.find(b => b._id === form.inventoryBatch);

  const SelectTrigger = ({ label, value, onPress, disabled, placeholder }) => (
    <View style={styles.selectContainer}>
      <TextInput
        label={label}
        value={value}
        mode="outlined"
        editable={false}
        right={<TextInput.Icon icon="chevron-down" />}
        outlineColor={COLORS.border}
        activeOutlineColor={COLORS.primary}
        style={{ backgroundColor: COLORS.surface }}
        placeholder={placeholder}
        disabled={disabled}
      />
      <TouchableRipple
        onPress={onPress}
        disabled={disabled}
        style={styles.touchOverlay}
        rippleColor="rgba(0, 0, 0, .1)"
      >
        <View />
      </TouchableRipple>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <SelectTrigger
          label="Select Product *"
          value={selectedProduct?.productName || ''}
          onPress={() => setProdModalVisible(true)}
        />

        <SelectTrigger
          label="Select Batch (Optional)"
          value={selectedBatch ? `${selectedBatch.batchNumber} (Exp: ${new Date(selectedBatch.expiryDate).toLocaleDateString()})` : (form.inventoryBatch === '' ? 'Apply to All Batches' : '')}
          onPress={() => setBatchModalVisible(true)}
          disabled={!form.product}
          placeholder="Apply to all batches"
        />

        <TextInput
          label="Discount Percent (%) *"
          value={form.discountPercent}
          onChangeText={v => update('discountPercent', v)}
          mode="outlined"
          style={styles.input}
          keyboardType="decimal-pad"
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
        />
        
        <TextInput
          label="Note"
          value={form.note}
          onChangeText={v => update('note', v)}
          mode="outlined"
          style={styles.input}
          multiline
          numberOfLines={3}
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
        />

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.btn}
          buttonColor={COLORS.primary}
          contentStyle={{ paddingVertical: 6 }}
        >
          Create Discount
        </Button>

        <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000} style={{ backgroundColor: COLORS.error }}>{error}</Snackbar>
      </ScrollView>

      <Portal>
        <Modal 
          visible={prodModalVisible} 
          onDismiss={() => setProdModalVisible(false)} 
          contentContainerStyle={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Product</Text>
            <IconButton icon="close" onPress={() => setProdModalVisible(false)} />
          </View>
          <Divider />
          <FlatList
            data={products}
            keyExtractor={item => item._id}
            renderItem={({ item }) => (
              <List.Item
                title={item.productName}
                description={`Category: ${item.mainCategory}`}
                onPress={() => {
                  update('product', item._id);
                  update('inventoryBatch', '');
                  setProdModalVisible(false);
                }}
                right={props => form.product === item._id && <List.Icon {...props} icon="check" color={COLORS.primary} />}
              />
            )}
            style={{ maxHeight: 400 }}
            ListEmptyComponent={<Text style={{ padding: 20, textAlign: 'center' }}>No products found</Text>}
          />
        </Modal>

        <Modal 
          visible={batchModalVisible} 
          onDismiss={() => setBatchModalVisible(false)} 
          contentContainerStyle={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Batch</Text>
            <IconButton icon="close" onPress={() => setBatchModalVisible(false)} />
          </View>
          <Divider />
          <List.Item
            title="Apply to All Batches"
            onPress={() => {
              update('inventoryBatch', '');
              setBatchModalVisible(false);
            }}
            right={props => form.inventoryBatch === '' && <List.Icon {...props} icon="check" color={COLORS.primary} />}
          />
          <Divider />
          <FlatList
            data={batches}
            keyExtractor={item => item._id}
            renderItem={({ item }) => (
              <List.Item
                title={`Batch: ${item.batchNumber}`}
                description={`Expires: ${new Date(item.expiryDate).toLocaleDateString()}`}
                onPress={() => {
                  update('inventoryBatch', item._id);
                  setBatchModalVisible(false);
                }}
                right={props => form.inventoryBatch === item._id && <List.Icon {...props} icon="check" color={COLORS.primary} />}
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

export default AddDiscountScreen;
