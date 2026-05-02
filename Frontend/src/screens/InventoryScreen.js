import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import PrimaryButton, { GhostButton } from '../components/PrimaryButton';
import {
  createInventoryBatch,
  deleteInventoryBatch,
  getInventoryBatches,
  getProducts,
  updateInventoryBatch,
} from '../api';
import { colors, shadow } from '../theme';

const BATCH_NUMBER_REGEX = /^B\d{3,}$/;

function formatDisplayDate(dateOnly) {
  if (!dateOnly) return '';
  const [year, month, day] = String(dateOnly).split('-');
  if (!year || !month || !day) return '';
  return `${month}/${day}/${year}`;
}

function normalizeDateForApi(value) {
  const clean = String(value || '').trim();
  if (!clean) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const date = new Date(`${clean}T00:00:00Z`);
    if (!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === clean) return clean;
  }

  const match = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';

  const [, month, day, year] = match;
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return '';
  return iso;
}

function getTodayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function statusMeta(status) {
  if (status === 'EXPIRED') {
    return { label: 'EXPIRED', color: colors.danger, backgroundColor: 'rgba(217,92,68,0.14)' };
  }
  if (status === 'EXPIRING_SOON') {
    return { label: 'EXPIRING SOON', color: colors.warning, backgroundColor: colors.warningSoft };
  }
  return { label: 'FRESH', color: colors.success, backgroundColor: 'rgba(30,158,115,0.14)' };
}

function ProductSelector({ products, value, onPress }) {
  const selected = products.find((product) => product.id === value);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>Product</Text>
      <Pressable style={styles.selector} onPress={onPress}>
        <Text numberOfLines={1} style={[styles.selectorText, !selected && styles.placeholderText]}>
          {selected ? selected.productName : '-- Select product --'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.slate} />
      </Pressable>
    </View>
  );
}

function CompactInput({ label, value, onChangeText, placeholder, keyboardType = 'default', style, inputRef }) {
  return (
    <View style={[styles.fieldWrap, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A5AFBF"
        keyboardType={keyboardType}
        autoCapitalize="characters"
        style={styles.input}
      />
    </View>
  );
}

function ProductPickerModal({ visible, products, selectedId, onClose, onSelect }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHead}>
            <View>
              <Text style={styles.modalTitle}>Choose Product</Text>
              <Text style={styles.modalSub}>Only seeded products can be added to inventory.</Text>
            </View>
            <Pressable style={styles.iconCircle} onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.slate} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.optionList}>
            {products.map((product) => {
              const active = selectedId === product.id;
              return (
                <Pressable
                  key={product.id}
                  onPress={() => {
                    onSelect(product.id);
                    onClose();
                  }}
                  style={[styles.optionCard, active && styles.optionCardActive]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>{product.productName}</Text>
                    <Text style={styles.optionSub}>{product.productId} | {product.mainCategory}</Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={22} color={colors.emerald} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DeleteModal({ batch, visible, deleting, onCancel, onConfirm }) {
  if (!batch) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.confirmCard}>
          <View style={styles.confirmIcon}>
            <Ionicons name="trash-outline" size={28} color={colors.danger} />
          </View>
          <Text style={styles.confirmTitle}>Delete Batch</Text>
          <Text style={styles.confirmText}>
            Remove {batch.batchNumber} for {batch.productName}? This cannot be undone.
          </Text>
          <View style={styles.confirmActions}>
            <GhostButton title="Cancel" onPress={onCancel} />
            <PrimaryButton title="Delete" onPress={onConfirm} loading={deleting} style={{ backgroundColor: colors.danger }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function InventoryScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1100;
  const batchInputRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState({
    productId: '',
    batchNumber: '',
    quantity: '',
    expiryDate: '',
  });

  useEffect(() => {
    loadInventoryData();
  }, []);

  const batchCountLabel = `${batches.length} ${batches.length === 1 ? 'BATCH' : 'BATCHES'}`;

  const sortedBatches = useMemo(() => (
    batches.slice().sort((a, b) => String(a.expiryDate).localeCompare(String(b.expiryDate)))
  ), [batches]);

  async function loadInventoryData() {
    setLoading(true);
    setError('');

    try {
      const [productsResult, batchesResult] = await Promise.all([
        getProducts(),
        getInventoryBatches(),
      ]);
      setProducts(productsResult);
      setBatches(batchesResult);
    } catch (loadError) {
      setError(loadError.message || 'Could not load inventory data.');
    } finally {
      setLoading(false);
    }
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function clearForm() {
    setEditingId('');
    setForm({
      productId: '',
      batchNumber: '',
      quantity: '',
      expiryDate: '',
    });
  }

  function startEdit(batch) {
    setError('');
    setEditingId(batch.id);
    setForm({
      productId: batch.productId,
      batchNumber: batch.batchNumber,
      quantity: String(batch.quantity),
      expiryDate: formatDisplayDate(batch.expiryDate),
    });

    setTimeout(() => {
      batchInputRef.current?.focus?.();
    }, 50);
  }

  async function saveBatch() {
    const payload = {
      productId: form.productId,
      batchNumber: String(form.batchNumber || '').trim().toUpperCase(),
      quantity: Number(form.quantity),
      expiryDate: normalizeDateForApi(form.expiryDate),
    };

    if (!payload.productId) {
      setError('Please select a product.');
      return;
    }
    if (!payload.batchNumber) {
      setError('Please enter a batch number.');
      return;
    }
    if (!BATCH_NUMBER_REGEX.test(payload.batchNumber)) {
      setError('Batch number must follow the format B001 or higher.');
      return;
    }
    if (!Number.isFinite(payload.quantity) || payload.quantity <= 50) {
      setError('Quantity must be greater than 50.');
      return;
    }
    if (!payload.expiryDate) {
      setError('Please enter a valid expiry date in MM/DD/YYYY or YYYY-MM-DD format.');
      return;
    }
    if (payload.expiryDate < getTodayDateOnly()) {
      setError('Expiry date cannot be in the past.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const savedBatch = editingId
        ? await updateInventoryBatch(editingId, payload)
        : await createInventoryBatch(payload);

      setBatches((current) => {
        if (editingId) {
          return current.map((batch) => (batch.id === editingId ? savedBatch : batch));
        }
        return [savedBatch, ...current];
      });
      clearForm();
    } catch (saveError) {
      setError(saveError.message || 'Could not save the batch.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      await deleteInventoryBatch(deleteTarget.id);
      setBatches((current) => current.filter((batch) => batch.id !== deleteTarget.id));
      setDeleteTarget(null);
      if (editingId === deleteTarget.id) clearForm();
    } catch (deleteError) {
      Alert.alert('Delete failed', deleteError.message || 'Could not delete the batch.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Text style={styles.pageTitle}>Inventory</Text>
        <Text style={styles.pageSubtitle}>ADD STOCK BATCHES WITH EXPIRY DATES (BATCHES EXPIRE, PRODUCTS DON'T).</Text>
      </View>

      {!!error && <Text style={styles.errorBanner}>{error}</Text>}

      <View style={[styles.contentRow, !isWide && styles.contentStack]}>
        <Card style={[styles.formCard, !isWide && styles.fullWidth]}>
          <Text style={styles.cardTitle}>Add Batch</Text>
          <Text style={styles.cardKicker}>{batchCountLabel}</Text>
          {!!editingId && (
            <Text style={styles.editingText}>Editing selected batch</Text>
          )}

          <View style={styles.formFields}>
            <ProductSelector products={products} value={form.productId} onPress={() => setPickerOpen(true)} />

            <View style={[styles.inlineFields, !isWide && styles.inlineFieldsStack]}>
              <CompactInput
                label="Batch Number"
                inputRef={batchInputRef}
                value={form.batchNumber}
                onChangeText={(value) => updateField('batchNumber', value.toUpperCase())}
                placeholder="e.g. B001"
                style={{ flex: 1 }}
              />
              <CompactInput
                label="Quantity"
                value={form.quantity}
                onChangeText={(value) => updateField('quantity', value)}
                placeholder="e.g. 50"
                keyboardType="numeric"
                style={{ flex: 1 }}
              />
            </View>

            <CompactInput
              label="Expiry Date"
              value={form.expiryDate}
              onChangeText={(value) => updateField('expiryDate', value)}
              placeholder="mm/dd/yyyy"
            />
          </View>

          <View style={styles.actionButtons}>
            <PrimaryButton
              title={editingId ? 'Update Batch' : 'Save Batch'}
              onPress={saveBatch}
              loading={saving}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              title="Clear"
              onPress={clearForm}
              variant="emerald"
              style={[styles.clearButton, { flex: 0.8 }]}
            />
          </View>
        </Card>

        <Card style={[styles.listCard, !isWide && styles.fullWidth]}>
          <Text style={styles.cardTitle}>Stock Batches</Text>
          <Text style={styles.cardKicker}>Sorted by expiry</Text>

          {isWide && (
            <View style={styles.tableHead}>
              <Text style={[styles.headCell, styles.productColumn]}>Product</Text>
              <Text style={styles.headCell}>Batch</Text>
              <Text style={styles.headCell}>Qty</Text>
              <Text style={styles.headCell}>Expiry</Text>
              <Text style={styles.headCell}>Status</Text>
              <Text style={[styles.headCell, styles.actionsColumn]}>Actions</Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 6 }}>
            {sortedBatches.map((batch) => {
              const meta = statusMeta(batch.status);
              if (!isWide) {
                return (
                  <View key={batch.id} style={styles.mobileBatchCard}>
                    <View style={styles.mobileBatchTop}>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={2} style={styles.mobileBatchName}>{batch.productName}</Text>
                        <Text numberOfLines={1} style={styles.mobileBatchCode}>{batch.batchNumber} | Qty {batch.quantity}</Text>
                      </View>
                    </View>

                    <Text style={styles.mobileBatchMeta}>Expiry: {batch.expiryDate}</Text>

                    <View style={[styles.statusPill, styles.mobileStatusPill, { backgroundColor: meta.backgroundColor }]}>
                      <Text style={[styles.statusText, styles.mobileStatusText, { color: meta.color }]}>{meta.label}</Text>
                    </View>

                    <View style={styles.mobileActionRow}>
                      <Pressable style={[styles.rowButton, styles.mobileActionButton]} onPress={() => startEdit(batch)}>
                        <Text style={styles.rowButtonText}>EDIT</Text>
                      </Pressable>
                      <Pressable style={[styles.rowButton, styles.mobileActionButton]} onPress={() => setDeleteTarget(batch)}>
                        <Text style={styles.rowButtonText}>DELETE</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              }

              return (
                <View key={batch.id} style={styles.rowCard}>
                  <Text numberOfLines={2} style={[styles.rowCell, styles.productColumn, styles.productName]}>{batch.productName}</Text>
                  <Text style={styles.rowCell}>{batch.batchNumber}</Text>
                  <Text style={styles.rowCell}>{batch.quantity}</Text>
                  <Text style={styles.rowCell}>{batch.expiryDate}</Text>
                  <View style={[styles.statusPill, { backgroundColor: meta.backgroundColor }]}>
                    <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  <View style={[styles.actionsColumn, styles.actionStack]}>
                    <Pressable style={styles.rowButton} onPress={() => startEdit(batch)}>
                      <Text style={styles.rowButtonText}>EDIT</Text>
                    </Pressable>
                    <Pressable style={styles.rowButton} onPress={() => setDeleteTarget(batch)}>
                      <Text style={styles.rowButtonText}>DELETE</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}

            {!sortedBatches.length && !loading && (
              <Text style={styles.emptyText}>No stock batches available yet.</Text>
            )}
            {loading && <Text style={styles.emptyText}>Loading inventory...</Text>}
          </ScrollView>
        </Card>
      </View>

      <ProductPickerModal
        visible={pickerOpen}
        products={products}
        selectedId={form.productId}
        onClose={() => setPickerOpen(false)}
        onSelect={(productId) => updateField('productId', productId)}
      />

      <DeleteModal
        batch={deleteTarget}
        visible={!!deleteTarget}
        deleting={deleting}
        onCancel={() => !deleting && setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 20,
  },
  hero: {
    gap: 8,
  },
  pageTitle: {
    color: colors.slate,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  pageSubtitle: {
    color: colors.muted,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontSize: 12,
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: '#FFF0EC',
    borderWidth: 1,
    borderColor: '#F5C7BB',
    color: colors.danger,
    padding: 12,
    borderRadius: 16,
    fontWeight: '800',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
  },
  contentStack: {
    flexDirection: 'column',
  },
  formCard: {
    width: 355,
    padding: 28,
  },
  listCard: {
    flex: 1,
    minHeight: 420,
    padding: 28,
  },
  fullWidth: {
    width: '100%',
  },
  cardTitle: {
    color: colors.slate,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  cardKicker: {
    marginTop: 4,
    color: '#A4A9B2',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  formFields: {
    marginTop: 20,
    gap: 16,
  },
  editingText: {
    marginTop: 10,
    color: colors.emerald,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 11,
  },
  fieldWrap: {
    gap: 8,
  },
  label: {
    color: '#596376',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  selector: {
    height: 58,
    borderRadius: 20,
    backgroundColor: '#F1F3F5',
    borderWidth: 1,
    borderColor: '#ECEDEF',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorText: {
    color: colors.slate,
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    marginRight: 10,
  },
  placeholderText: {
    color: '#9CA7B8',
  },
  inlineFields: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  inlineFieldsStack: {
    flexDirection: 'column',
  },
  input: {
    height: 56,
    borderRadius: 18,
    backgroundColor: '#F1F3F5',
    borderWidth: 1,
    borderColor: '#ECEDEF',
    paddingHorizontal: 16,
    color: colors.slate,
    fontSize: 15,
    fontWeight: '800',
  },
  actionButtons: {
    marginTop: 28,
    flexDirection: 'row',
    gap: 10,
  },
  clearButton: {
    backgroundColor: colors.emerald,
  },
  tableHead: {
    marginTop: 30,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headCell: {
    flex: 0.8,
    color: '#6B7487',
    fontWeight: '900',
    letterSpacing: 1.4,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  productColumn: {
    flex: 1.6,
  },
  actionsColumn: {
    flex: 1.15,
  },
  rowCard: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowCell: {
    flex: 0.8,
    color: colors.slate,
    fontWeight: '800',
    fontSize: 14,
  },
  productName: {
    fontSize: 15,
    fontWeight: '900',
  },
  statusPill: {
    flex: 1.1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  actionStack: {
    gap: 8,
  },
  rowButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  rowButtonText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  emptyText: {
    color: colors.muted,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 24,
  },
  mobileBatchCard: {
    borderWidth: 1,
    borderColor: '#EEF0F2',
    borderRadius: 22,
    padding: 16,
    gap: 12,
    marginTop: 10,
    backgroundColor: '#FCFDFC',
  },
  mobileBatchTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  mobileBatchName: {
    color: colors.slate,
    fontSize: 16,
    fontWeight: '900',
  },
  mobileBatchCode: {
    marginTop: 4,
    color: colors.muted,
    fontWeight: '700',
  },
  mobileBatchMeta: {
    color: colors.slate,
    fontWeight: '800',
  },
  mobileStatusPill: {
    alignSelf: 'flex-start',
    minWidth: 120,
    maxWidth: '100%',
    paddingHorizontal: 14,
    minHeight: 40,
  },
  mobileStatusText: {
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 13,
  },
  mobileActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mobileActionButton: {
    flex: 1,
    height: 48,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18,26,47,0.54)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    borderRadius: 34,
    backgroundColor: '#fff',
    padding: 24,
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  modalTitle: {
    color: colors.slate,
    fontSize: 24,
    fontWeight: '900',
  },
  modalSub: {
    marginTop: 4,
    color: '#A4A9B2',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontSize: 11,
    fontWeight: '900',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F4F6F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionList: {
    gap: 10,
    paddingTop: 20,
  },
  optionCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF0F2',
    backgroundColor: '#FAFBFB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionCardActive: {
    borderColor: '#BCE2D6',
    backgroundColor: '#F0FAF6',
  },
  optionTitle: {
    color: colors.slate,
    fontWeight: '900',
    fontSize: 15,
  },
  optionSub: {
    marginTop: 4,
    color: colors.muted,
    fontWeight: '700',
    fontSize: 12,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 32,
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    gap: 14,
  },
  confirmIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: '#FFF0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: {
    color: colors.slate,
    fontSize: 22,
    fontWeight: '900',
  },
  confirmText: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '700',
  },
  confirmActions: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
});
