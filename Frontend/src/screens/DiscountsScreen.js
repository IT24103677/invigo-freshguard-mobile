import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  createDiscount,
  deleteDiscount,
  getBatches,
  getBatchesByProduct,
  getDiscountPromoImageUrl,
  getDiscounts,
  getProducts,
  toggleDiscount,
  updateDiscount,
  uploadDiscountPromoImage,
} from '../api';
import Card from '../components/Card';
import FormInput from '../components/FormInput';
import PrimaryButton, { GhostButton } from '../components/PrimaryButton';
import Screen from '../components/Screen';
import WorkspaceHeader from '../components/WorkspaceHeader';
import { colors } from '../theme';

// ── Helpers ────────────────────────────────────────────────────────────────────
function daysLeft(expiryDate) {
  if (!expiryDate) return null;
  return Math.ceil((new Date(expiryDate) - Date.now()) / 86400000);
}

function normalizeDiscount(raw) {
  return {
    ...raw,
    id: raw?.id || raw?._id || '',
    productName:     raw?.productName || '',
    batchNumber:     raw?.batchNumber || '',
    discountPercent: raw?.discountPercent ?? 0,
    note:            raw?.note || '',
    active:          Boolean(raw?.active),
    source:          raw?.source || 'MANUAL',
    promotionImageFileId:   raw?.promotionImageFileId || null,
    promotionImageUpdatedAt: raw?.promotionImageUpdatedAt || null,
  };
}

// ── Promo image ────────────────────────────────────────────────────────────────
function PromoImage({ discount, size = 52 }) {
  const [err, setErr] = useState(false);
  const uri = !err && discount?.promotionImageFileId
    ? getDiscountPromoImageUrl(discount.id, discount.promotionImageUpdatedAt)
    : null;

  if (!uri) {
    return (
      <View style={[styles.promoAvatar, { width: size, height: size, borderRadius: size * 0.3 }]}>
        <Ionicons name="pricetag-outline" size={size * 0.4} color={colors.purple} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size * 0.3 }}
      onError={() => setErr(true)}
    />
  );
}

async function ensureImageLibraryAccess() {
  if (Platform.OS === 'web') {
    return true;
  }

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

// ── Stat tile ──────────────────────────────────────────────────────────────────
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

// ── Create / Edit modal ────────────────────────────────────────────────────────
function DiscountModal({ visible, onClose, onSubmit, initialDiscount, loading, products }) {
  const isEdit = Boolean(initialDiscount);
  const [productId, setProductId] = useState('');
  const [batches, setBatches]     = useState([]);
  const [batchId, setBatchId]     = useState('');
  const [pct, setPct]             = useState('');
  const [note, setNote]           = useState('');
  const [active, setActive]       = useState(true);
  const [productSearch, setProductSearch] = useState('');
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [error, setError]         = useState('');

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return !q ? products : products.filter((p) =>
      `${p.name} ${p.category}`.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  useEffect(() => {
    if (!visible) return;
    setError('');
    setProductSearch('');
    if (isEdit) {
      setPct(String(initialDiscount.discountPercent));
      setNote(initialDiscount.note || '');
      setActive(initialDiscount.active);
      setProductId('');
      setBatches([]);
      setBatchId('');
    } else {
      setProductId(''); setBatches([]); setBatchId('');
      setPct(''); setNote(''); setActive(true);
    }
  }, [visible, isEdit]);

  async function pickProduct(pid) {
    setProductId(pid);
    setBatchId('');
    setBatches([]);
    if (!pid) return;
    setLoadingBatches(true);
    try {
      const data = await getBatchesByProduct(pid);
      setBatches(data || []);
    } catch { setBatches([]); }
    finally { setLoadingBatches(false); }
  }

  function submit() {
    const p = parseInt(pct, 10);
    if (!isEdit && !productId) { setError('Select a product.'); return; }
    if (!isEdit && !batchId)   { setError('Select a batch.'); return; }
    if (!p || p < 1 || p > 90) { setError('Discount must be 1–90%.'); return; }
    setError('');

    if (isEdit) {
      onSubmit({ discountPercent: p, note: note.trim() || null, active }, initialDiscount);
    } else {
      onSubmit({
        productId,
        batchId,
        discountPercent: p,
        note: note.trim() || null,
        source: 'MANUAL',
      });
    }
  }

  const selectedBatch = batches.find((b) => (b.id || b._id) === batchId);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalTop}>
            <Text style={styles.modalTitle}>{isEdit ? 'Edit Discount' : 'New Discount'}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.slate} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {!!error && <Text style={styles.error}>{error}</Text>}

            {/* Product picker — create only */}
            {!isEdit && (
              <View>
                <FormInput label="Search Product" icon="search-outline" value={productSearch} onChangeText={setProductSearch} placeholder="Filter products…" />
                <ScrollView style={styles.pickerList} nestedScrollEnabled showsVerticalScrollIndicator>
                  {filteredProducts.slice(0, 20).map((p) => {
                    const sel = (p.id || p._id) === productId;
                    return (
                      <Pressable
                        key={p.id || p._id}
                        style={[styles.pickerItem, sel && styles.pickerItemActive]}
                        onPress={() => pickProduct(p.id || p._id)}
                      >
                        <Text style={[styles.pickerName, sel && styles.pickerNameActive]} numberOfLines={1}>{p.name}</Text>
                        <Text style={styles.pickerMeta}>{p.category}</Text>
                      </Pressable>
                    );
                  })}
                  {!filteredProducts.length && <Text style={styles.empty}>No products found.</Text>}
                </ScrollView>
              </View>
            )}

            {/* Batch picker — create only, after product selected */}
            {!isEdit && productId && (
              <View>
                <Text style={styles.smallLabel}>Select Batch {loadingBatches ? '(Loading…)' : ''}</Text>
                <ScrollView style={styles.pickerList} nestedScrollEnabled showsVerticalScrollIndicator>
                  {batches.map((b) => {
                    const id  = b.id || b._id;
                    const sel = id === batchId;
                    const days = daysLeft(b.expiryDate);
                    return (
                      <Pressable
                        key={id}
                        style={[styles.pickerItem, sel && styles.pickerItemActive]}
                        onPress={() => setBatchId(id)}
                      >
                        <Text style={[styles.pickerName, sel && styles.pickerNameActive]}>
                          {b.batchNumber || `Batch #${id?.slice(-4)}`}
                          {days !== null ? `  ·  ${days < 0 ? 'Expired' : `${days}d left`}` : ''}
                        </Text>
                        <Text style={styles.pickerMeta}>Qty: {b.quantityOnHand}</Text>
                      </Pressable>
                    );
                  })}
                  {!batches.length && !loadingBatches && <Text style={styles.empty}>No batches found for this product.</Text>}
                </ScrollView>
              </View>
            )}

            {/* Batch preview */}
            {selectedBatch && (
              <View style={styles.previewRow}>
                <Ionicons name="archive-outline" size={16} color={colors.emerald} />
                <Text style={styles.previewText}>
                  {selectedBatch.batchNumber || 'Batch'} · Qty {selectedBatch.quantityOnHand}
                  {daysLeft(selectedBatch.expiryDate) !== null
                    ? `  ·  ${daysLeft(selectedBatch.expiryDate) < 0 ? 'Expired' : `${daysLeft(selectedBatch.expiryDate)}d left`}`
                    : ''}
                </Text>
              </View>
            )}

            {/* Existing product/batch (edit mode) */}
            {isEdit && (
              <View style={styles.previewRow}>
                <Ionicons name="cube-outline" size={16} color={colors.purple} />
                <Text style={styles.previewText}>
                  {initialDiscount.productName}
                  {initialDiscount.batchNumber ? `  ·  Batch #${initialDiscount.batchNumber}` : ''}
                </Text>
              </View>
            )}

            <FormInput
              label="Discount %"
              icon="pricetag-outline"
              value={pct}
              onChangeText={setPct}
              placeholder="e.g. 20"
              keyboardType="numeric"
            />
            <FormInput
              label="Note (optional)"
              icon="document-text-outline"
              value={note}
              onChangeText={setNote}
              placeholder="Reason for discount…"
            />

            {/* Active toggle — edit only */}
            {isEdit && (
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Active</Text>
                <Switch
                  value={active}
                  onValueChange={setActive}
                  trackColor={{ true: colors.emerald, false: 'rgba(15,23,42,0.15)' }}
                  thumbColor="#fff"
                />
                <Text style={[styles.toggleStatus, { color: active ? colors.emerald : 'rgba(15,23,42,0.4)' }]}>
                  {active ? 'Live' : 'Paused'}
                </Text>
              </View>
            )}

            <PrimaryButton title={isEdit ? 'Save Changes' : 'Create Discount'} onPress={submit} loading={loading} variant="purple" />
            <GhostButton title="Cancel" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function DiscountsScreen({ go, sessionUser, onLogout }) {
  const isAdmin = String(sessionUser?.role || '').toUpperCase() === 'ADMIN';

  const [discounts, setDiscounts] = useState([]);
  const [products, setProducts]   = useState([]);
  const [batches, setBatches]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [error, setError]         = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDiscount, setModalDiscount] = useState(null);
  const [filterActive, setFilterActive] = useState('all');
  const [query, setQuery]         = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [discountData, productData, batchData] = await Promise.all([
        getDiscounts(),
        getProducts(),
        getBatches(),
      ]);
      setDiscounts((discountData || []).map(normalizeDiscount));
      setProducts(productData || []);
      setBatches(batchData || []);
    } catch (e) {
      setError(e.message || 'Could not load discounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Stats
  const stats = useMemo(() => {
    const total    = discounts.length;
    const active   = discounts.filter((d) => d.active).length;
    const ai       = discounts.filter((d) => d.source === 'AI').length;
    const avgPct   = total === 0 ? 0 : Math.round(discounts.reduce((s, d) => s + d.discountPercent, 0) / total);
    return { total, active, inactive: total - active, ai, avgPct };
  }, [discounts]);

  // AI suggestions — HIGH risk batches without an active discount
  const discountedBatchIds = useMemo(() => new Set(discounts.filter((d) => d.active).map((d) => d.batchId)), [discounts]);

  const aiSuggestions = useMemo(() =>
    batches
      .filter((b) => (b.riskLevel === 'HIGH' || b.riskLevel === 'CRITICAL') && !discountedBatchIds.has(b.id))
      .slice(0, 5),
  [batches, discountedBatchIds]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = [...discounts];
    if (filterActive === 'active')   list = list.filter((d) => d.active);
    if (filterActive === 'inactive') list = list.filter((d) => !d.active);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((d) =>
        (d.productName || '').toLowerCase().includes(q) ||
        (d.batchNumber || '').toLowerCase().includes(q) ||
        (d.note || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [discounts, filterActive, query]);

  // CRUD handlers
  async function handleSubmit(form, existing) {
    setSaving(true);
    try {
      if (existing) {
        const updated = normalizeDiscount(await updateDiscount(existing.id, form));
        setDiscounts((cur) => cur.map((d) => d.id === existing.id ? updated : d));
      } else {
        const created = normalizeDiscount(await createDiscount(form));
        setDiscounts((cur) => [created, ...cur]);
      }
      setModalOpen(false);
    } catch (e) {
      Alert.alert('Save failed', e.message || 'Could not save discount.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(discount) {
    setTogglingId(discount.id);
    try {
      const updated = normalizeDiscount(await toggleDiscount(discount.id));
      setDiscounts((cur) => cur.map((d) => d.id === updated.id ? updated : d));
    } catch (e) {
      Alert.alert('Failed', e.message || 'Could not toggle discount.');
    } finally {
      setTogglingId(null);
    }
  }

  function handleDelete(discount) {
    Alert.alert('Delete Discount', `Remove ${discount.discountPercent}% off "${discount.productName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteDiscount(discount.id);
            setDiscounts((cur) => cur.filter((d) => d.id !== discount.id));
          } catch (e) {
            Alert.alert('Failed', e.message || 'Could not delete discount.');
          }
        },
      },
    ]);
  }

  async function handleApplySuggestion(batch) {
    setSaving(true);
    try {
      const pct = batch.suggestedDiscount || 15;
      const pid = typeof batch.productId === 'object' ? (batch.productId?.id || batch.productId?._id) : batch.productId;
      const created = normalizeDiscount(await createDiscount({
        productId: pid,
        batchId: batch.id,
        discountPercent: Math.round(pct),
        source: 'AI',
      }));
      setDiscounts((cur) => [created, ...cur]);
    } catch (e) {
      Alert.alert('Failed', e.message || 'Could not apply suggestion.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePromoUpload(discount) {
    const allowed = await ensureImageLibraryAccess();
    if (!allowed) {
      Alert.alert('Permission required', 'Allow photo library access to upload a promotion image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploadingId(discount.id);
    try {
      const updated = normalizeDiscount(await uploadDiscountPromoImage(discount.id, result.assets[0]));
      setDiscounts((cur) => cur.map((d) => d.id === updated.id ? updated : d));
    } catch (e) {
      Alert.alert('Upload failed', e.message || 'Could not upload image.');
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <Screen scroll={false} style={{ paddingBottom: 0 }}>
      <WorkspaceHeader
        pillLabel="Discounts"
        pillIcon="pricetag-outline"
        pillColor={colors.purple}
        onLogout={onLogout}
        go={go}
        role={sessionUser?.role}
        sessionUser={sessionUser}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
      >
        <View style={styles.pageHeader}>
          <Text style={[styles.kicker, { color: colors.purple }]}>Discount Management</Text>
          <View style={styles.pageTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Discounts</Text>
              <Text style={styles.sub}>Set discounts on batches nearing expiry to reduce waste.</Text>
            </View>
            {isAdmin && (
              <Pressable style={styles.addBtn} onPress={() => { setModalDiscount(null); setModalOpen(true); }}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            )}
          </View>
        </View>

        {!!error && <Text style={styles.warn}>{error}</Text>}

        {/* Stats */}
        <View style={styles.statsRow}>
          <Stat label="Total"    value={stats.total}    icon="pricetag-outline"   color={colors.slate} />
          <Stat label="Active"   value={stats.active}   icon="checkmark-circle-outline" color={colors.emerald} />
          <Stat label="AI"       value={stats.ai}       icon="flash-outline"       color={colors.purple} />
          <Stat label="Avg %"    value={`${stats.avgPct}%`} icon="trending-down-outline" color={colors.magenta} />
        </View>

        {/* AI suggestions */}
        {aiSuggestions.length > 0 && (
          <Card style={[styles.aiCard]}>
            <View style={styles.aiHeader}>
              <View style={styles.aiTitle}>
                <Ionicons name="flash-outline" size={16} color={colors.purple} />
                <Text style={styles.aiTitleText}>Smart Suggestions</Text>
              </View>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>{aiSuggestions.length}</Text>
              </View>
            </View>
            <Text style={styles.aiSub}>High-risk batches without an active discount</Text>

            {aiSuggestions.map((b) => {
              const days = daysLeft(b.expiryDate);
              const pn   = typeof b.productId === 'object' ? b.productId?.name : (b.productName || '');
              return (
                <View key={b.id} style={styles.suggestionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestionName} numberOfLines={1}>{pn}</Text>
                    <Text style={styles.suggestionMeta}>
                      {b.batchNumber ? `Batch #${b.batchNumber}  ·  ` : ''}
                      Qty {b.quantityOnHand}
                      {days !== null ? `  ·  ${days < 0 ? 'Expired' : `${days}d`}` : ''}
                    </Text>
                    <View style={styles.suggestionBadges}>
                      <View style={[styles.suggBadge, { backgroundColor: '#FEF2F2' }]}>
                        <Text style={[styles.suggBadgeText, { color: '#DC2626' }]}>{b.riskLevel}</Text>
                      </View>
                      <View style={[styles.suggBadge, { backgroundColor: `${colors.purple}18` }]}>
                        <Text style={[styles.suggBadgeText, { color: colors.purple }]}>
                          {b.suggestedDiscount || 15}% OFF suggested
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Pressable
                    style={[styles.applyBtn, saving && { opacity: 0.6 }]}
                    onPress={() => handleApplySuggestion(b)}
                    disabled={saving}
                  >
                    <Ionicons name="checkmark" size={14} color="#fff" />
                    <Text style={styles.applyBtnText}>Apply</Text>
                  </Pressable>
                </View>
              );
            })}
          </Card>
        )}

        {/* Discounts list */}
        <Card>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>All Discounts</Text>
            <Text style={styles.listSub}>{filtered.length} of {discounts.length}</Text>
          </View>

          <FormInput label="Search" icon="search-outline" value={query} onChangeText={setQuery} placeholder="Search product, batch, note…" />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
            <View style={styles.filterRow}>
              {[['all', 'All'], ['active', 'Active'], ['inactive', 'Inactive']].map(([val, lbl]) => (
                <Pressable
                  key={val}
                  onPress={() => setFilterActive(val)}
                  style={[styles.filterChip, filterActive === val && styles.filterChipActive]}
                >
                  <Text style={[styles.filterText, filterActive === val && styles.filterTextActive]}>{lbl}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="pricetag-outline" size={36} color="rgba(15,23,42,0.2)" />
              <Text style={styles.emptyText}>
                {discounts.length === 0 ? 'No discounts yet.' : 'No discounts match the filter.'}
              </Text>
            </View>
          ) : (
            filtered.map((d) => {
              const isToggling = togglingId === d.id;
              const isUploading = uploadingId === d.id;
              return (
                <View key={d.id} style={[styles.discountCard, !d.active && { opacity: 0.6 }]}>
                  <View style={styles.discountTop}>
                    <PromoImage discount={d} size={48} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.discountTitleRow}>
                        <Text style={styles.discountProduct} numberOfLines={1}>{d.productName || `Product`}</Text>
                        {d.source === 'AI' && (
                          <View style={[styles.sourceBadge, { backgroundColor: `${colors.purple}18` }]}>
                            <Text style={[styles.sourceBadgeText, { color: colors.purple }]}>AI</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.discountBatch}>
                        {d.batchNumber ? `Batch #${d.batchNumber}` : 'No batch#'}
                      </Text>
                    </View>
                    <View style={[styles.pctBadge, { backgroundColor: `${colors.purple}18` }]}>
                      <Text style={[styles.pctText, { color: colors.purple }]}>{d.discountPercent}% OFF</Text>
                    </View>
                  </View>

                  {!!d.note && <Text style={styles.discountNote}>{d.note}</Text>}

                  <View style={styles.discountActions}>
                    <View style={styles.toggleWrap}>
                      <Switch
                        value={d.active}
                        onValueChange={() => !isToggling && handleToggle(d)}
                        disabled={!isAdmin || isToggling}
                        trackColor={{ true: colors.emerald, false: 'rgba(15,23,42,0.15)' }}
                        thumbColor="#fff"
                      />
                      <Text style={[styles.toggleStatus, { color: d.active ? colors.emerald : 'rgba(15,23,42,0.4)' }]}>
                        {d.active ? 'Live' : 'Paused'}
                      </Text>
                    </View>

                    {isAdmin && (
                      <View style={styles.adminBtns}>
                        <Pressable style={styles.smallBtn} onPress={() => handlePromoUpload(d)} disabled={isUploading}>
                          <Ionicons name="camera-outline" size={14} color={colors.purple} />
                          <Text style={[styles.smallBtnText, { color: colors.purple }]}>
                            {isUploading ? '…' : 'Image'}
                          </Text>
                        </Pressable>
                        <Pressable style={styles.smallBtn} onPress={() => { setModalDiscount(d); setModalOpen(true); }}>
                          <Text style={styles.smallBtnText}>Edit</Text>
                        </Pressable>
                        <Pressable style={styles.smallBtn} onPress={() => handleDelete(d)}>
                          <Text style={[styles.smallBtnText, { color: colors.danger }]}>Delete</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>

      {isAdmin && (
        <DiscountModal
          visible={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          initialDiscount={modalDiscount}
          loading={saving}
          products={products}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageHeader:    { marginTop: 4, marginBottom: 18 },
  kicker:        { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  title:         { color: colors.slate, fontSize: 31, fontWeight: '900', letterSpacing: -1.2 },
  sub:           { color: 'rgba(15,23,42,0.58)', fontWeight: '700', lineHeight: 22, marginTop: 8 },
  pageTitleRow:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginTop: 4 },
  addBtn:        { height: 42, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.purple, flexDirection: 'row', alignItems: 'center', gap: 6 },
  addBtnText:    { color: '#fff', fontSize: 12, fontWeight: '900' },
  warn:          { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', color: '#92400E', padding: 12, borderRadius: 16, fontWeight: '800', marginBottom: 14 },
  statsRow:      { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statCard:      { flex: 1, backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)', borderRadius: 24, padding: 12 },
  statIcon:      { width: 36, height: 36, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue:     { color: colors.slate, fontSize: 20, fontWeight: '900' },
  statLabel:     { color: 'rgba(15,23,42,0.48)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  aiCard:        { borderLeftWidth: 3, borderLeftColor: colors.purple, marginBottom: 2 },
  aiHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  aiTitle:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiTitleText:   { color: colors.slate, fontWeight: '900', fontSize: 16 },
  aiBadge:       { backgroundColor: colors.purple, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  aiBadgeText:   { color: '#fff', fontSize: 11, fontWeight: '900' },
  aiSub:         { color: 'rgba(15,23,42,0.48)', fontSize: 12, fontWeight: '700', marginBottom: 12 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(15,23,42,0.06)' },
  suggestionName: { color: colors.slate, fontWeight: '900', fontSize: 13 },
  suggestionMeta: { color: 'rgba(15,23,42,0.48)', fontSize: 11, fontWeight: '700', marginTop: 2 },
  suggestionBadges: { flexDirection: 'row', gap: 6, marginTop: 6 },
  suggBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  suggBadgeText: { fontSize: 10, fontWeight: '900' },
  applyBtn:      { backgroundColor: colors.emerald, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 4 },
  applyBtnText:  { color: '#fff', fontWeight: '900', fontSize: 12 },
  listHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  listTitle:     { color: colors.slate, fontSize: 18, fontWeight: '900' },
  listSub:       { color: 'rgba(15,23,42,0.4)', fontSize: 12, fontWeight: '800' },
  filterRow:     { flexDirection: 'row', gap: 8 },
  filterChip:    { paddingHorizontal: 14, height: 36, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(15,23,42,0.1)', backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { backgroundColor: colors.purple, borderColor: colors.purple },
  filterText:    { color: 'rgba(15,23,42,0.55)', fontWeight: '800', fontSize: 12 },
  filterTextActive: { color: '#fff' },
  emptyWrap:     { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText:     { color: 'rgba(15,23,42,0.45)', fontWeight: '800', textAlign: 'center' },
  discountCard:  { backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 22, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(15,23,42,0.06)', gap: 8 },
  discountTop:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  discountTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  discountProduct: { color: colors.slate, fontWeight: '900', fontSize: 14, flex: 1 },
  discountBatch: { color: 'rgba(15,23,42,0.45)', fontSize: 11, fontWeight: '700', marginTop: 2 },
  discountNote:  { color: 'rgba(15,23,42,0.52)', fontSize: 12, fontWeight: '700', fontStyle: 'italic' },
  pctBadge:      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  pctText:       { fontWeight: '900', fontSize: 13 },
  sourceBadge:   { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  sourceBadgeText: { fontSize: 10, fontWeight: '900' },
  discountActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleWrap:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleStatus:  { fontSize: 12, fontWeight: '800' },
  adminBtns:     { flexDirection: 'row', gap: 6 },
  smallBtn:      { height: 34, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(15,23,42,0.1)', backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
  smallBtnText:  { color: colors.slate, fontWeight: '900', fontSize: 11 },
  promoAvatar:   { alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.purple}14` },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalCard:     { maxHeight: '93%', backgroundColor: '#F4F7F0', borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: 20 },
  modalTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle:    { color: colors.slate, fontSize: 23, fontWeight: '900' },
  closeBtn:      { width: 42, height: 42, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' },
  error:         { backgroundColor: '#FEF2F2', color: '#DC2626', borderWidth: 1, borderColor: '#FECACA', padding: 12, borderRadius: 16, textAlign: 'center', fontWeight: '800' },
  smallLabel:    { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(15,23,42,0.45)', marginBottom: 6 },
  pickerList:    { maxHeight: 170, borderWidth: 1, borderColor: 'rgba(15,23,42,0.1)', borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.7)', marginTop: 4 },
  pickerItem:    { padding: 12, borderBottomWidth: 1, borderColor: 'rgba(15,23,42,0.06)' },
  pickerItemActive: { backgroundColor: `${colors.purple}14` },
  pickerName:    { color: colors.slate, fontWeight: '800', fontSize: 13 },
  pickerNameActive: { color: colors.purple },
  pickerMeta:    { color: 'rgba(15,23,42,0.45)', fontSize: 11, fontWeight: '700', marginTop: 2 },
  previewRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 16, backgroundColor: `${colors.emerald}12`, borderWidth: 1, borderColor: `${colors.emerald}25` },
  previewText:   { flex: 1, color: colors.emerald, fontWeight: '800', fontSize: 13 },
  toggleRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' },
  toggleLabel:   { flex: 1, color: colors.slate, fontWeight: '800', fontSize: 14 },
  empty:         { color: 'rgba(15,23,42,0.45)', fontWeight: '700', textAlign: 'center', padding: 14 },
});
