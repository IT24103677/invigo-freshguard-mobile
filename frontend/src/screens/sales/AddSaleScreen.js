import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, FlatList } from 'react-native';
import { TextInput, Button, Snackbar, Portal, Modal, Text, Divider, List, IconButton, TouchableRipple } from 'react-native-paper';
import { salesAPI, productsAPI, inventoryAPI } from '../../services/api';
import { COLORS } from '../../constants/config';

const AddSaleScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState({ product: '', inventoryBatch: '', quantity: '', customerName: '', note: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedBatchInfo, setSelectedBatchInfo] = useState(null);

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

  useEffect(() => {
    if (form.inventoryBatch) {
      const batch = batches.find(b => b._id === form.inventoryBatch);
      setSelectedBatchInfo(batch);
    } else {
      setSelectedBatchInfo(null);
    }
  }, [form.inventoryBatch, batches]);

  const update = (k, v) => setForm({ ...form, [k]: v });

  const handleSubmit = async () => {
    if (!form.product || !form.inventoryBatch || !form.quantity) {
      return setError('Please fill all required fields');
    }

    setLoading(true);
    try {
      await salesAPI.create({
        ...form,
        quantity: parseInt(form.quantity),
      });
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || 'Sale failed');
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
          label="Select Batch *"
          value={selectedBatch ? `${selectedBatch.batchNumber} (Exp: ${new Date(selectedBatch.expiryDate).toLocaleDateString()})` : ''}
          onPress={() => setBatchModalVisible(true)}
          disabled={!form.product}
          placeholder="Select a batch"
        />

        {selectedBatchInfo && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Available Qty: {selectedBatchInfo.quantity}</Text>
            <Text style={styles.infoText}>Expiry Date: {new Date(selectedBatchInfo.expiryDate).toLocaleDateString()}</Text>
          </View>
        )}

        <TextInput label="Quantity to Sell *" value={form.quantity} onChangeText={v => update('quantity', v)}
          mode="outlined" style={styles.input} keyboardType="number-pad" outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
        
        <TextInput label="Customer Name" value={form.customerName} onChangeText={v => update('customerName', v)}
          mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />
        
        <TextInput label="Note" value={form.note} onChangeText={v => update('note', v)}
          mode="outlined" style={styles.input} multiline outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

        <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading}
          style={styles.btn} buttonColor={COLORS.primary} contentStyle={{ paddingVertical: 6 }}>
          Record Sale
        </Button>

        <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000} style={{ backgroundColor: COLORS.error }}>{error}</Snackbar>
      </ScrollView>

      <Portal>
        <Modal visible={prodModalVisible} onDismiss={() => setProdModalVisible(false)} contentContainerStyle={styles.modalContent}>
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
                onPress={() => {
                  update('product', item._id);
                  update('inventoryBatch', '');
                  setProdModalVisible(false);
                }}
                right={props => form.product === item._id && <List.Icon {...props} icon="check" color={COLORS.primary} />}
              />
            )}
            style={{ maxHeight: 400 }}
          />
        </Modal>

        <Modal visible={batchModalVisible} onDismiss={() => setBatchModalVisible(false)} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Batch</Text>
            <IconButton icon="close" onPress={() => setBatchModalVisible(false)} />
          </View>
          <Divider />
          <FlatList
            data={batches}
            keyExtractor={item => item._id}
            renderItem={({ item }) => (
              <List.Item
                title={`Batch: ${item.batchNumber}`}
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
  infoBox: { backgroundColor: COLORS.primaryLight, padding: 12, borderRadius: 8, marginBottom: 12 },
  infoText: { color: COLORS.secondary, fontSize: 13, fontWeight: '600' },
  input: { marginBottom: 12, backgroundColor: COLORS.surface },
  btn: { borderRadius: 12, marginTop: 8, marginBottom: 32 },
  modalContent: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
});

export default AddSaleScreen;
