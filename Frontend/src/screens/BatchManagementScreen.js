import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import {
  createBatch,
  deleteBatch,
  getBatches,
  getBatchDocumentUrl,
  getProducts,
  getSuppliers,
  updateBatch,
  uploadBatchDocument,
} from '../api';
import Card from '../components/Card';
import FormInput from '../components/FormInput';
import PrimaryButton, { GhostButton } from '../components/PrimaryButton';
import Screen from '../components/Screen';
import WorkspaceHeader from '../components/WorkspaceHeader';
import { colors } from '../theme';

const STORAGE_CONDITIONS = ['Refrigerated', 'Frozen', 'Ambient', 'Cool & Dry', 'Other'];
const BATCH_DOCUMENT_TYPES = ['image/*', 'application/pdf'];

async function pickBatchDocument() {
  const result = await DocumentPicker.getDocumentAsync({
    type: BATCH_DOCUMENT_TYPES,
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const file = result.assets[0];
  return {
    uri: file.uri,
    name: file.name,
    mimeType: file.mimeType || file.type || 'application/octet-stream',
    file: file.file || null,
  };
}

function normalizeBatch(raw) {
  const product = raw?.productId || {};
  return {
    ...raw,
    id: raw?.id || raw?._id || '',
    productId: typeof product === 'object' ? (product.id || product._id || '') : (raw?.productId || ''),
    productName: typeof product === 'object' ? (product.name || 'Unknown Product') : 'Unknown Product',
    productCategory: typeof product === 'object' ? (product.category || '') : '',
    productUnit: typeof product === 'object' ? (product.unitType || '') : '',
    batchNumber: raw?.batchNumber || '',
    receivedDate: raw?.receivedDate ? new Date(raw.receivedDate).toISOString().slice(0, 10) : '',
    expiryDate: raw?.expiryDate ? new Date(raw.expiryDate).toISOString().slice(0, 10) : '',
    quantityOnHand: raw?.quantityOnHand ?? 0,
    storageCondition: raw?.storageCondition || '',
    location: raw?.location || '',
    costPerUnit: raw?.costPerUnit != null ? String(raw.costPerUnit) : '',
    supplierName: raw?.supplierName || '',
    notes: raw?.notes || '',
    documentFileId: raw?.documentFileId || null,
    documentUpdatedAt: raw?.documentUpdatedAt || null,
  };
}

function expiryStatus(expiryDate) {
  if (!expiryDate) return null;
  const days = Math.floor((new Date(expiryDate) - Date.now()) / 86400000);
  if (days < 0) return { label: 'Expired', color: colors.danger };
  if (days === 0) return { label: 'Expires today', color: colors.danger };
  if (days <= 7) return { label: `${days}d left`, color: colors.danger };
  if (days <= 30) return { label: `${days}d left`, color: colors.warning };
  return { label: `${days}d left`, color: colors.emerald };
}

function Stat({ label, value, icon, color }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ChipButton({ title, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{title}</Text>
    </Pressable>
  );
}

function BatchCard({ batch, onEdit, onDelete, onUploadDocument, onViewDocument, isAdmin }) {
  const status = expiryStatus(batch.expiryDate);
  const hasDoc = Boolean(batch.documentFileId);

  return (
    <Card style={styles.batchCard}>
      <View style={styles.batchTop}>
        <View style={[styles.batchIcon, { backgroundColor: `${colors.emerald}18` }]}>
          <Ionicons name="archive-outline" size={22} color={colors.emerald} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.batchProductName} numberOfLines={1}>{batch.productName}</Text>
          <Text style={styles.batchMeta}>{batch.productCategory}{batch.batchNumber ? ` · #${batch.batchNumber}` : ''}</Text>
        </View>
        {status && (
          <Text style={[styles.expiryPill, { color: status.color, backgroundColor: `${status.color}16` }]}>
            {status.label}
          </Text>
        )}
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Qty</Text>
          <Text style={styles.infoValue}>{batch.quantityOnHand}</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Received</Text>
          <Text style={styles.infoValue}>{batch.receivedDate || '--'}</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Expires</Text>
          <Text style={[styles.infoValue, status && { color: status.color }]}>{batch.expiryDate || '--'}</Text>
        </View>
      </View>

      <View style={styles.tagsRow}>
        {!!batch.storageCondition && <Text style={styles.tag}>{batch.storageCondition}</Text>}
        {!!batch.location && <Text style={styles.tag}><Ionicons name="location-outline" size={11} /> {batch.location}</Text>}
        {!!batch.supplierName && <Text style={styles.tag}>{batch.supplierName}</Text>}
        {batch.costPerUnit !== '' && <Text style={styles.tag}>Rs {batch.costPerUnit}/unit</Text>}
        {hasDoc && <Text style={[styles.tag, { color: colors.emerald }]}><Ionicons name="document-outline" size={11} /> Doc attached</Text>}
      </View>

      {!!batch.notes && <Text style={styles.notes}>{batch.notes}</Text>}

      {isAdmin && (
        <View style={styles.actionRow}>
          <Pressable style={styles.smallBtn} onPress={() => onEdit(batch)} hitSlop={8}>
            <Text style={styles.smallBtnText}>Edit</Text>
          </Pressable>
          {hasDoc ? (
            <Pressable style={styles.smallBtn} onPress={() => onViewDocument(batch)} hitSlop={8}>
              <Text style={styles.smallBtnText}>View Doc</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.smallBtn} onPress={() => onUploadDocument(batch)} hitSlop={8}>
            <Text style={styles.smallBtnText}>{hasDoc ? 'Replace Doc' : 'Upload Doc'}</Text>
          </Pressable>
          <Pressable style={styles.smallBtn} onPress={() => onDelete(batch)} hitSlop={8}>
            <Text style={[styles.smallBtnText, { color: colors.danger }]}>Delete</Text>
          </Pressable>
        </View>
      )}
    </Card>
  );
}

function DeleteBatchModal({ batch, visible, loading, onCancel, onConfirm }) {
  if (!batch) return null;
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.confirmBackdrop}>
        <View style={styles.confirmCard}>
          <View style={styles.confirmIconWrap}>
            <Ionicons name="trash-outline" size={28} color={colors.danger} />
          </View>
          <Text style={styles.confirmTitle}>Delete Batch</Text>
          <Text style={styles.confirmText}>
            Delete batch for &ldquo;{batch.productName}&rdquo;{batch.batchNumber ? ` (#${batch.batchNumber})` : ''}? This will hide it from inventory.
          </Text>
          <View style={styles.confirmActions}>
            <GhostButton title="Cancel" onPress={onCancel} />
            <PrimaryButton title="Delete" onPress={onConfirm} loading={loading} style={styles.confirmDeleteBtn} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SupplierPicker({ suppliers = [], value, onChange }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const active = suppliers.filter((s) => !s.status || s.status === 'Active');
    return !q ? active : active.filter((s) =>
      `${s.supplierName} ${s.category}`.toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  if (value) {
    return (
      <View style={styles.optionWrap}>
        <Text style={styles.smallLabel}>Supplier</Text>
        <Pressable style={styles.supplierSelected} onPress={() => onChange('')}>
          <Ionicons name="business-outline" size={15} color={colors.magenta} />
          <Text style={styles.supplierSelectedText} numberOfLines={1}>{value}</Text>
          <Ionicons name="close-circle-outline" size={16} color={colors.magenta} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.optionWrap}>
      <Text style={styles.smallLabel}>Supplier</Text>
      <FormInput label="" icon="search-outline" value={search} onChangeText={setSearch} placeholder="Search suppliers..." />
      <ScrollView style={styles.supplierPicker} nestedScrollEnabled showsVerticalScrollIndicator>
        {filtered.slice(0, 20).map((s) => (
          <Pressable
            key={s.id || s._id}
            style={styles.supplierPickerItem}
            onPress={() => { onChange(s.supplierName); setSearch(''); }}
          >
            <Text style={styles.supplierPickerName}>{s.supplierName}</Text>
            <Text style={styles.supplierPickerMeta}>{s.category}</Text>
          </Pressable>
        ))}
        {!filtered.length && (
          <Text style={styles.empty}>
            {suppliers.length ? 'No matching suppliers.' : 'No suppliers added yet.'}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const EMPTY_FORM = {
  productId: '', batchNumber: '', receivedDate: '', expiryDate: '',
  quantityOnHand: '', storageCondition: '', location: '',
  costPerUnit: '', supplierName: '', notes: '',
};

function BatchModal({ visible, onClose, onSubmit, initialBatch, loading, products, suppliers }) {
  const isEdit = Boolean(initialBatch);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [productSearch, setProductSearch] = useState('');

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return !q ? products : products.filter((p) =>
      `${p.name} ${p.category} ${p.sku}`.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  useEffect(() => {
    if (!visible) return;
    setError('');
    setProductSearch('');
    setForm(initialBatch ? {
      productId: initialBatch.productId || '',
      batchNumber: initialBatch.batchNumber || '',
      receivedDate: initialBatch.receivedDate || '',
      expiryDate: initialBatch.expiryDate || '',
      quantityOnHand: String(initialBatch.quantityOnHand ?? ''),
      storageCondition: initialBatch.storageCondition || '',
      location: initialBatch.location || '',
      costPerUnit: initialBatch.costPerUnit !== '' ? String(initialBatch.costPerUnit) : '',
      supplierName: initialBatch.supplierName || '',
      notes: initialBatch.notes || '',
    } : EMPTY_FORM);
  }, [visible, initialBatch]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    const qty = parseInt(form.quantityOnHand, 10);
    if (!isEdit && !form.productId) { setError('Please select a product.'); return; }
    if (!form.receivedDate) { setError('Received date is required.'); return; }
    if (!form.expiryDate) { setError('Expiry date is required.'); return; }
    if (form.expiryDate < form.receivedDate) { setError('Expiry date cannot be before received date.'); return; }
    if (form.quantityOnHand === '' || isNaN(qty) || qty < 0) { setError('Enter a valid quantity (0 or more).'); return; }

    const payload = {
      batchNumber: form.batchNumber.trim() || null,
      receivedDate: form.receivedDate,
      expiryDate: form.expiryDate,
      quantityOnHand: qty,
      storageCondition: form.storageCondition || null,
      location: form.location.trim() || null,
      costPerUnit: form.costPerUnit !== '' ? parseFloat(form.costPerUnit) : null,
      supplierName: form.supplierName.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (!isEdit) {
      payload.productId = form.productId;
    }

    onSubmit(payload, initialBatch);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalTop}>
            <Text style={styles.modalTitle}>{isEdit ? 'Edit Batch' : 'Add Batch'}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.slate} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {!!error && <Text style={styles.error}>{error}</Text>}

            {!isEdit && (
              <View>
                <FormInput label="Search Product" icon="search-outline" value={productSearch} onChangeText={setProductSearch} placeholder="Search products..." />
                <ScrollView style={styles.productPicker} nestedScrollEnabled showsVerticalScrollIndicator>
                  {filteredProducts.slice(0, 20).map((p) => (
                    <Pressable
                      key={p.id || p._id}
                      style={[styles.productPickerItem, form.productId === (p.id || p._id) && styles.productPickerItemActive]}
                      onPress={() => update('productId', p.id || p._id)}
                    >
                      <Text style={[styles.productPickerName, form.productId === (p.id || p._id) && styles.productPickerNameActive]} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.productPickerMeta}>{p.category} · {p.unitType}</Text>
                    </Pressable>
                  ))}
                  {!filteredProducts.length && <Text style={styles.empty}>No products found.</Text>}
                </ScrollView>
              </View>
            )}

            {isEdit && (
              <View style={styles.productSelected}>
                <Ionicons name="cube-outline" size={18} color={colors.emerald} />
                <Text style={styles.productSelectedText}>{initialBatch?.productName}</Text>
              </View>
            )}

            <FormInput label="Batch Number" icon="layers-outline" value={form.batchNumber} onChangeText={(v) => update('batchNumber', v)} placeholder="Optional batch/lot number" />
            <FormInput label="Received Date (YYYY-MM-DD)" icon="calendar-outline" value={form.receivedDate} onChangeText={(v) => update('receivedDate', v)} placeholder="2026-04-01" />
            <FormInput label="Expiry Date (YYYY-MM-DD)" icon="time-outline" value={form.expiryDate} onChangeText={(v) => update('expiryDate', v)} placeholder="2026-06-01" />
            <FormInput label="Quantity on Hand" icon="cube-outline" value={form.quantityOnHand} onChangeText={(v) => update('quantityOnHand', v)} placeholder="0" keyboardType="numeric" />
            <FormInput label="Cost Per Unit (Rs)" icon="pricetag-outline" value={form.costPerUnit} onChangeText={(v) => update('costPerUnit', v)} placeholder="Optional cost" keyboardType="decimal-pad" />
            <SupplierPicker suppliers={suppliers} value={form.supplierName} onChange={(v) => update('supplierName', v)} />
            <FormInput label="Storage Location" icon="location-outline" value={form.location} onChangeText={(v) => update('location', v)} placeholder="e.g. Shelf A2, Cold Room 1" />
            <FormInput label="Notes" icon="document-text-outline" value={form.notes} onChangeText={(v) => update('notes', v)} placeholder="Delivery notes or observations" multiline />

            <View style={styles.optionWrap}>
              <Text style={styles.smallLabel}>Storage Condition</Text>
              <View style={styles.optionGrid}>
                {STORAGE_CONDITIONS.map((cond) => (
                  <Pressable
                    key={cond}
                    onPress={() => update('storageCondition', form.storageCondition === cond ? '' : cond)}
                    style={[styles.option, form.storageCondition === cond && { backgroundColor: colors.emerald, borderColor: colors.emerald }]}
                  >
                    <Text style={[styles.optionText, form.storageCondition === cond && styles.optionTextActive]}>{cond}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <PrimaryButton title={isEdit ? 'Save Batch' : 'Create Batch'} onPress={submit} loading={loading} variant="purple" />
            <GhostButton title="Cancel" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function BatchManagementScreen({ go, sessionUser, onLogout }) {
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [query, setQuery] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBatch, setModalBatch] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = String(sessionUser?.role || '').toUpperCase() === 'ADMIN';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [batchData, productData, supplierData] = await Promise.all([getBatches(), getProducts(), getSuppliers()]);
      setBatches((batchData || []).map(normalizeBatch));
      setProducts(productData || []);
      setSuppliers(supplierData || []);
    } catch (e) {
      setError(e.message || 'Could not load batch data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();

    return batches.filter((b) => {
      const text = `${b.productName} ${b.batchNumber} ${b.supplierName} ${b.location} ${b.storageCondition}`.toLowerCase();
      const matchesSearch = !q || text.includes(q);

      let matchesExpiry = true;
      if (expiryFilter === 'expired') {
        matchesExpiry = new Date(b.expiryDate) < now;
      } else if (expiryFilter === 'expiring') {
        const days = Math.floor((new Date(b.expiryDate) - now) / 86400000);
        matchesExpiry = days >= 0 && days <= 30;
      } else if (expiryFilter === 'good') {
        matchesExpiry = Math.floor((new Date(b.expiryDate) - now) / 86400000) > 30;
      }

      return matchesSearch && matchesExpiry;
    });
  }, [batches, query, expiryFilter]);

  const totalQty = batches.reduce((sum, b) => sum + (b.quantityOnHand || 0), 0);
  const expiredCount = batches.filter((b) => b.expiryDate && new Date(b.expiryDate) < Date.now()).length;
  const expiringCount = batches.filter((b) => {
    if (!b.expiryDate) return false;
    const days = Math.floor((new Date(b.expiryDate) - Date.now()) / 86400000);
    return days >= 0 && days <= 7;
  }).length;

  async function submitBatch(form, existing) {
    setSaving(true);
    try {
      const saved = normalizeBatch(
        existing
          ? await updateBatch(existing.id, form)
          : await createBatch(form)
      );
      setBatches((cur) => existing
        ? cur.map((b) => b.id === existing.id ? saved : b)
        : [saved, ...cur]
      );
      setModalOpen(false);
    } catch (e) {
      Alert.alert('Save failed', e.message || 'Could not save batch.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDocumentUpload(batch) {
    const file = await pickBatchDocument();
    if (!file) return;

    setUploadingDoc(true);
    try {
      const updated = normalizeBatch(await uploadBatchDocument(batch.id, file));
      setBatches((cur) => cur.map((b) => b.id === updated.id ? updated : b));
      Alert.alert('Success', 'Batch document uploaded successfully.');
    } catch (e) {
      Alert.alert('Upload failed', e.message || 'Could not upload document.');
    } finally {
      setUploadingDoc(false);
    }
  }

  function handleViewDocument(batch) {
    const url = getBatchDocumentUrl(batch.id, batch.documentUpdatedAt);

    Linking.openURL(url).catch(() => {
      Alert.alert('Open failed', 'Could not open the batch document right now.');
    });
  }

  async function performDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBatch(deleteTarget.id);
      setBatches((cur) => cur.filter((b) => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      Alert.alert('Delete failed', e.message || 'Could not delete batch.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Screen scroll={false} style={{ paddingBottom: 0 }}>
      <WorkspaceHeader pillLabel="Batch Management" pillIcon="archive-outline" onLogout={onLogout} go={go} role={sessionUser?.role} sessionUser={sessionUser} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.kicker}>Inventory</Text>
          <View style={styles.pageTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Batches</Text>
              <Text style={styles.sub}>Track product batches, expiry dates, and FEFO stock rotation.</Text>
            </View>
          </View>
        </View>

        {!!error && <Text style={styles.warn}>{error}</Text>}

        <View style={styles.statsGrid}>
          <Stat label="Total Units" value={totalQty} icon="layers-outline" color={colors.emerald} />
          <Stat label="Expiring Soon" value={expiringCount} icon="warning-outline" color={colors.warning} />
          <Stat label="Expired" value={expiredCount} icon="alert-circle-outline" color={colors.danger} />
        </View>

        <View style={styles.sectionGap}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Batch Registry</Text>
              <Text style={styles.sectionSub}>{filtered.length} batches found</Text>
            </View>
            {isAdmin && (
              <Pressable style={styles.compactAddBtn} onPress={() => { setModalBatch(null); setModalOpen(true); }}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.compactAddText}>Add</Text>
              </Pressable>
            )}
          </View>

          <FormInput label="Search Batches" icon="search-outline" value={query} onChangeText={setQuery} placeholder="Search by product, batch#, supplier, location..." />

          <Text style={styles.filterTitle}>Expiry Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {[['all', 'All'], ['good', 'Good'], ['expiring', 'Expiring ≤30d'], ['expired', 'Expired']].map(([key, label]) => (
              <ChipButton key={key} title={label} active={expiryFilter === key} onPress={() => setExpiryFilter(key)} />
            ))}
          </ScrollView>

          {uploadingDoc && (
            <View style={styles.uploadingBanner}>
              <Ionicons name="cloud-upload-outline" size={16} color={colors.emerald} />
              <Text style={styles.uploadingText}>Uploading document...</Text>
            </View>
          )}

          {filtered.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              onEdit={(b) => { setModalBatch(b); setModalOpen(true); }}
              onDelete={setDeleteTarget}
              onUploadDocument={handleDocumentUpload}
              onViewDocument={handleViewDocument}
              isAdmin={isAdmin}
            />
          ))}
          {!filtered.length && (
            <Text style={styles.empty}>
              {batches.length ? 'No batches match the current filters.' : 'No batches yet. Add your first batch.'}
            </Text>
          )}
        </View>
      </ScrollView>

      <BatchModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={submitBatch}
        initialBatch={modalBatch}
        loading={saving}
        products={products}
        suppliers={suppliers}
      />

      <DeleteBatchModal
        batch={deleteTarget}
        visible={!!deleteTarget}
        loading={deleting}
        onCancel={() => !deleting && setDeleteTarget(null)}
        onConfirm={performDelete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageHeader: { marginTop: 4, marginBottom: 18 },
  kicker: { color: colors.emerald, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  title: { color: colors.slate, fontSize: 31, fontWeight: '900', letterSpacing: -1.2 },
  sub: { color: 'rgba(15,23,42,0.58)', fontWeight: '700', lineHeight: 22, marginTop: 8 },
  pageTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  warn: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', color: '#92400E', padding: 12, borderRadius: 16, fontWeight: '800', marginBottom: 14 },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 12 },
  statIcon: { width: 36, height: 36, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { color: colors.slate, fontSize: 24, fontWeight: '900' },
  statLabel: { color: 'rgba(15,23,42,0.48)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  sectionGap: { gap: 12 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, marginBottom: 2 },
  sectionTitle: { color: colors.slate, fontSize: 20, fontWeight: '900', marginTop: 4 },
  sectionSub: { color: 'rgba(15,23,42,0.46)', fontSize: 12, fontWeight: '800', marginTop: 3 },
  compactAddBtn: { height: 42, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.slate, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  compactAddText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  filterTitle: { color: colors.slate, fontWeight: '900', fontSize: 13, marginTop: 4 },
  filterRow: { gap: 8, paddingVertical: 2 },
  filterChip: { paddingHorizontal: 13, height: 38, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { backgroundColor: colors.emerald, borderColor: colors.emerald },
  filterText: { color: colors.slate, fontWeight: '800', fontSize: 12 },
  filterTextActive: { color: '#fff' },
  uploadingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${colors.emerald}14`, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: `${colors.emerald}30` },
  uploadingText: { color: colors.emerald, fontWeight: '800', fontSize: 13 },
  batchCard: { gap: 10, padding: 16, borderRadius: 26, marginBottom: 2 },
  batchTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  batchIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  batchProductName: { color: colors.slate, fontSize: 16, fontWeight: '900' },
  batchMeta: { color: 'rgba(15,23,42,0.48)', fontSize: 12, fontWeight: '700', marginTop: 3 },
  expiryPill: { overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, fontWeight: '900', fontSize: 10 },
  infoGrid: { flexDirection: 'row', gap: 8 },
  infoBox: { flex: 1, backgroundColor: 'rgba(15,23,42,0.04)', borderRadius: 18, padding: 11, borderWidth: 1, borderColor: colors.border },
  infoLabel: { color: 'rgba(15,23,42,0.42)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  infoValue: { color: colors.slate, fontSize: 14, fontWeight: '900', marginTop: 3 },
  tagsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: { overflow: 'hidden', color: 'rgba(15,23,42,0.62)', backgroundColor: 'rgba(15,23,42,0.06)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontWeight: '900', fontSize: 11 },
  notes: { color: 'rgba(15,23,42,0.55)', fontWeight: '700', fontSize: 12, fontStyle: 'italic', lineHeight: 18 },
  actionRow: { flexDirection: 'row', gap: 8 },
  smallBtn: { flex: 1, height: 40, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  smallBtnText: { color: colors.slate, fontWeight: '900', fontSize: 11 },
  empty: { color: 'rgba(15,23,42,0.5)', fontWeight: '800', textAlign: 'center', paddingVertical: 18 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '92%', backgroundColor: colors.background, borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: 20 },
  modalTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle: { color: colors.slate, fontSize: 23, fontWeight: '900' },
  closeBtn: { width: 42, height: 42, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  error: { backgroundColor: '#FEF2F2', color: colors.danger, borderWidth: 1, borderColor: '#FECACA', padding: 12, borderRadius: 16, textAlign: 'center', fontWeight: '800' },
  confirmBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 20 },
  confirmCard: { backgroundColor: colors.background, borderRadius: 30, padding: 22, gap: 14, borderWidth: 1, borderColor: colors.border },
  confirmIconWrap: { width: 64, height: 64, borderRadius: 24, backgroundColor: 'rgba(239,68,68,0.12)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  confirmTitle: { color: colors.slate, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  confirmText: { color: 'rgba(15,23,42,0.58)', fontWeight: '700', lineHeight: 22, textAlign: 'center' },
  confirmActions: { gap: 10, marginTop: 4 },
  confirmDeleteBtn: { backgroundColor: colors.danger },
  productPicker: { maxHeight: 180, borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.7)', marginTop: 6 },
  productPickerItem: { padding: 12, borderBottomWidth: 1, borderColor: colors.border },
  productPickerItemActive: { backgroundColor: `${colors.emerald}18` },
  productPickerName: { color: colors.slate, fontWeight: '800', fontSize: 13 },
  productPickerNameActive: { color: colors.emerald },
  productPickerMeta: { color: 'rgba(15,23,42,0.48)', fontSize: 11, fontWeight: '700', marginTop: 2 },
  productSelected: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 18, backgroundColor: `${colors.emerald}14`, borderWidth: 1, borderColor: `${colors.emerald}30` },
  productSelectedText: { color: colors.emerald, fontWeight: '900', fontSize: 14 },
  smallLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(15,23,42,0.45)', marginBottom: 8 },
  optionWrap: { gap: 4 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.68)' },
  optionText: { color: colors.slate, fontWeight: '900', fontSize: 12 },
  optionTextActive: { color: '#fff' },
  supplierPicker: { maxHeight: 160, borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.7)', marginTop: 6 },
  supplierPickerItem: { padding: 12, borderBottomWidth: 1, borderColor: colors.border },
  supplierPickerName: { color: colors.slate, fontWeight: '800', fontSize: 13 },
  supplierPickerMeta: { color: 'rgba(15,23,42,0.45)', fontSize: 11, fontWeight: '700', marginTop: 2 },
  supplierSelected: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13, borderRadius: 18, backgroundColor: `${colors.magenta}12`, borderWidth: 1, borderColor: `${colors.magenta}30` },
  supplierSelectedText: { flex: 1, color: colors.magenta, fontWeight: '900', fontSize: 13 },
});
