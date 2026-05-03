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
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  createProduct,
  deleteProduct,
  getProductImageUrl,
  getProducts,
  getSuppliers,
  updateProduct,
  uploadProductImage,
} from '../api';
import Card from '../components/Card';
import FormInput from '../components/FormInput';
import PrimaryButton, { GhostButton } from '../components/PrimaryButton';
import Screen from '../components/Screen';
import WorkspaceHeader from '../components/WorkspaceHeader';
import { colors } from '../theme';

const CATEGORIES = ['Dairy', 'Produce', 'Bakery', 'Meat', 'Beverages', 'Dry Goods', 'Frozen', 'Other'];
const UNIT_TYPES = ['kg', 'g', 'litre', 'ml', 'piece', 'pack', 'box', 'dozen'];

function normalizeProduct(raw) {
  return {
    ...raw,
    id: raw?.id || raw?._id || '',
    name: raw?.name || '',
    category: raw?.category || 'Other',
    brand: raw?.brand || '',
    supplier: raw?.supplier || '',
    unitType: raw?.unitType || 'piece',
    buyingPrice: raw?.buyingPrice != null ? String(raw.buyingPrice) : '',
    sellingPrice: raw?.sellingPrice != null ? String(raw.sellingPrice) : '',
    baseSellingPrice: Number(raw?.baseSellingPrice ?? raw?.sellingPrice ?? 0),
    discountedSellingPrice: Number(raw?.discountedSellingPrice ?? raw?.sellingPrice ?? 0),
    activeDiscountPercent: Number(raw?.activeDiscountPercent || 0),
    hasActiveDiscount: Boolean(raw?.hasActiveDiscount),
    nextSellableBatchNumber: raw?.nextSellableBatchNumber || null,
    imageFileId: raw?.imageFileId || null,
    imageUpdatedAt: raw?.imageUpdatedAt || null,
    sellableUnits: raw?.sellableUnits ?? 0,
    activeBatchCount: raw?.activeBatchCount ?? 0,
    nearestExpiryDate: raw?.nearestExpiryDate ?? null,
  };
}

function stockColor(units) {
  if (units === 0) return colors.danger;
  if (units < 10) return colors.warning;
  return colors.emerald;
}

function stockLabel(units) {
  if (units === 0) return 'Out of stock';
  if (units < 10) return `Low (${units})`;
  return `In stock (${units})`;
}

function expiryLabel(dateStr) {
  if (!dateStr) return null;
  const days = Math.floor((new Date(dateStr) - Date.now()) / 86400000);
  if (days < 0) return { text: 'Expired', color: colors.danger };
  if (days <= 7) return { text: `Expires in ${days}d`, color: colors.danger };
  if (days <= 30) return { text: `Expires in ${days}d`, color: colors.warning };
  return null;
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

function OptionSelector({ label, options, value, onChange, activeColor = colors.purple }) {
  return (
    <View style={styles.optionWrap}>
      <Text style={styles.smallLabel}>{label}</Text>
      <View style={styles.optionGrid}>
        {options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[styles.option, value === opt && { backgroundColor: activeColor, borderColor: activeColor }]}
          >
            <Text style={[styles.optionText, value === opt && styles.optionTextActive]}>{opt}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ProductImage({ product, size = 52 }) {
  const [error, setError] = useState(false);
  const uri = !error && product?.imageFileId
    ? getProductImageUrl(product.id, product.imageUpdatedAt)
    : null;

  if (!uri) {
    return (
      <View style={[styles.productAvatar, { width: size, height: size, borderRadius: size * 0.35, backgroundColor: `${colors.purple}22` }]}>
        <Ionicons name="cube-outline" size={size * 0.44} color={colors.purple} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size * 0.35 }}
      onError={() => setError(true)}
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

function ProductCard({ product, onEdit, onDelete, isAdmin }) {
  const sColor = stockColor(product.sellableUnits);
  const expiry = expiryLabel(product.nearestExpiryDate);
  const baseSellingPrice = Number(product.baseSellingPrice ?? product.sellingPrice ?? 0);
  const discountedSellingPrice = Number(product.discountedSellingPrice ?? baseSellingPrice);
  const activeDiscountPercent = Number(product.activeDiscountPercent || 0);
  const hasActiveDiscount = activeDiscountPercent > 0;

  return (
    <Card style={styles.productCard}>
      <View style={styles.productTop}>
        <ProductImage product={product} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.productMeta}>{product.category}{product.brand ? ` · ${product.brand}` : ''}</Text>
        </View>
        <Text style={[styles.stockPill, { color: sColor, backgroundColor: `${sColor}16` }]}>
          {stockLabel(product.sellableUnits)}
        </Text>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Buying</Text>
          <Text style={styles.infoValue}>Rs {Number(product.buyingPrice).toFixed(2)}</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Selling</Text>
          <Text style={styles.infoValue}>
            Rs {(hasActiveDiscount ? discountedSellingPrice : baseSellingPrice).toFixed(2)}
          </Text>
          {hasActiveDiscount ? (
            <View style={styles.priceMetaRow}>
              <Text style={styles.infoValueSub}>Was Rs {baseSellingPrice.toFixed(2)}</Text>
              <Text style={styles.discountPill}>{activeDiscountPercent}% OFF</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Batches</Text>
          <Text style={styles.infoValue}>{product.activeBatchCount}</Text>
        </View>
      </View>

      <View style={styles.tagsRow}>
        {!!product.unitType && <Text style={styles.tag}>{product.unitType}</Text>}
        {!!expiry && <Text style={[styles.tag, { color: expiry.color, backgroundColor: `${expiry.color}14` }]}>{expiry.text}</Text>}
      </View>

      {isAdmin && (
        <View style={styles.actionRow}>
          <Pressable style={styles.smallBtn} onPress={() => onEdit(product)} hitSlop={8}>
            <Text style={styles.smallBtnText}>Edit</Text>
          </Pressable>
          <Pressable style={styles.smallBtn} onPress={() => onDelete(product)} hitSlop={8}>
            <Text style={[styles.smallBtnText, { color: colors.danger }]}>Delete</Text>
          </Pressable>
        </View>
      )}
    </Card>
  );
}

function DeleteProductModal({ product, visible, loading, onCancel, onConfirm }) {
  if (!product) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.confirmBackdrop}>
        <View style={styles.confirmCard}>
          <View style={styles.confirmIconWrap}>
            <Ionicons name="trash-outline" size={28} color={colors.danger} />
          </View>
          <Text style={styles.confirmTitle}>Delete Product</Text>
          <Text style={styles.confirmText}>
            Delete &ldquo;{product.name}&rdquo; permanently? All associated data remains but this product will be hidden.
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
          <Ionicons name="business-outline" size={15} color={colors.purple} />
          <Text style={styles.supplierSelectedText} numberOfLines={1}>{value}</Text>
          <Ionicons name="close-circle-outline" size={16} color={colors.purple} />
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
  name: '', category: 'Dairy', brand: '',
  supplier: '', unitType: 'piece', buyingPrice: '', sellingPrice: '',
};

function ProductModal({ visible, onClose, onSubmit, onImageUpload, initialProduct, loading, uploadingImage, suppliers }) {
  const isEdit = Boolean(initialProduct);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setError('');
    setForm(initialProduct ? {
      name: initialProduct.name || '',
      category: initialProduct.category || 'Dairy',
      brand: initialProduct.brand || '',
      supplier: initialProduct.supplier || '',
      unitType: initialProduct.unitType || 'piece',
      buyingPrice: initialProduct.buyingPrice != null ? String(initialProduct.buyingPrice) : '',
      sellingPrice: initialProduct.sellingPrice != null ? String(initialProduct.sellingPrice) : '',
    } : EMPTY_FORM);
  }, [visible, initialProduct]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    const name = form.name.trim();
    const buying = parseFloat(form.buyingPrice);
    const selling = parseFloat(form.sellingPrice);

    if (!name || name.length < 2) { setError('Product name must be at least 2 characters.'); return; }
    if (!form.category) { setError('Please select a category.'); return; }
    if (!form.unitType) { setError('Please select a unit type.'); return; }
    if (form.buyingPrice === '' || isNaN(buying) || buying < 0) { setError('Enter a valid buying price.'); return; }
    if (form.sellingPrice === '' || isNaN(selling) || selling < 0) { setError('Enter a valid selling price.'); return; }

    onSubmit({
      name,
      category: form.category,
      sku: null,
      barcode: null,
      brand: form.brand.trim() || null,
      supplier: form.supplier.trim() || null,
      unitType: form.unitType,
      buyingPrice: buying,
      sellingPrice: selling,
    }, initialProduct);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalTop}>
            <Text style={styles.modalTitle}>{isEdit ? 'Edit Product' : 'Add Product'}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.slate} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {!!error && <Text style={styles.error}>{error}</Text>}

            {isEdit && (
              <Pressable
                style={styles.imageUploadBtn}
                onPress={() => onImageUpload(initialProduct)}
                disabled={uploadingImage}
              >
                <ProductImage product={initialProduct} size={48} />
                <Text style={styles.imageUploadText}>{uploadingImage ? 'Uploading...' : 'Change product image'}</Text>
                <Ionicons name="camera-outline" size={18} color={colors.purple} />
              </Pressable>
            )}

            <FormInput label="Product Name" icon="cube-outline" value={form.name} onChangeText={(v) => update('name', v)} placeholder="e.g. Fresh Whole Milk" />
            <FormInput label="Brand" icon="ribbon-outline" value={form.brand} onChangeText={(v) => update('brand', v)} placeholder="Optional brand name" />
            <SupplierPicker suppliers={suppliers} value={form.supplier} onChange={(v) => update('supplier', v)} />
            <FormInput label="Buying Price (Rs)" icon="pricetag-outline" value={form.buyingPrice} onChangeText={(v) => update('buyingPrice', v)} placeholder="0.00" keyboardType="decimal-pad" />
            <FormInput label="Selling Price (Rs)" icon="cash-outline" value={form.sellingPrice} onChangeText={(v) => update('sellingPrice', v)} placeholder="0.00" keyboardType="decimal-pad" />

            <OptionSelector label="Category" options={CATEGORIES} value={form.category} onChange={(v) => update('category', v)} activeColor={colors.emerald} />
            <OptionSelector label="Unit Type" options={UNIT_TYPES} value={form.unitType} onChange={(v) => update('unitType', v)} activeColor={colors.purple} />

            <PrimaryButton title={isEdit ? 'Save Product' : 'Create Product'} onPress={submit} loading={loading} variant="purple" />
            <GhostButton title="Cancel" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function ProductManagementScreen({ go, sessionUser, onLogout }) {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = String(sessionUser?.role || '').toUpperCase() === 'ADMIN';

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [productData, supplierData] = await Promise.all([getProducts(), getSuppliers()]);
      setProducts((productData || []).map(normalizeProduct));
      setSuppliers(supplierData || []);
    } catch (e) {
      setError(e.message || 'Could not load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const text = `${p.name} ${p.category} ${p.brand} ${p.supplier}`.toLowerCase();
      const matchesSearch = !q || text.includes(q);
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, query, categoryFilter]);

  const totalUnits = products.reduce((sum, p) => sum + (p.sellableUnits || 0), 0);
  const outOfStock = products.filter((p) => p.sellableUnits === 0).length;
  const lowStock = products.filter((p) => p.sellableUnits > 0 && p.sellableUnits < 10).length;

  async function submitProduct(form, existing) {
    setSaving(true);
    try {
      const saved = normalizeProduct(
        existing
          ? await updateProduct(existing.id, form)
          : await createProduct(form)
      );
      setProducts((cur) => existing
        ? cur.map((p) => p.id === existing.id ? saved : p)
        : [saved, ...cur]
      );
      setModalOpen(false);
    } catch (e) {
      Alert.alert('Save failed', e.message || 'Could not save product.');
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(product) {
    const allowed = await ensureImageLibraryAccess();
    if (!allowed) {
      Alert.alert('Permission required', 'Allow photo library access to upload a product image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setUploadingImage(true);
    try {
      const asset = result.assets[0];
      const updated = normalizeProduct(await uploadProductImage(product.id, asset));
      setProducts((cur) => cur.map((p) => p.id === updated.id ? updated : p));
      setModalProduct(updated);
    } catch (e) {
      Alert.alert('Upload failed', e.message || 'Could not upload image.');
    } finally {
      setUploadingImage(false);
    }
  }

  async function performDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      setProducts((cur) => cur.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      Alert.alert('Delete failed', e.message || 'Could not delete product.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Screen scroll={false} style={{ paddingBottom: 0 }}>
      <WorkspaceHeader pillLabel="Product Management" pillIcon="cube-outline" onLogout={onLogout} go={go} role={sessionUser?.role} sessionUser={sessionUser} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadProducts} />}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.kicker}>Inventory</Text>
          <View style={styles.pageTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Products</Text>
              <Text style={styles.sub}>Manage your product catalog with pricing and stock visibility.</Text>
            </View>
          </View>
        </View>

        {!!error && <Text style={styles.warn}>{error}</Text>}

        <View style={styles.statsGrid}>
          <Stat label="Total Units" value={totalUnits} icon="layers-outline" color={colors.emerald} />
          <Stat label="Out of Stock" value={outOfStock} icon="close-circle-outline" color={colors.danger} />
          <Stat label="Low Stock" value={lowStock} icon="warning-outline" color={colors.warning} />
        </View>

        <View style={styles.sectionGap}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Product Catalog</Text>
              <Text style={styles.sectionSub}>{filtered.length} products found</Text>
            </View>
            {isAdmin && (
              <Pressable style={styles.compactAddBtn} onPress={() => { setModalProduct(null); setModalOpen(true); }}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.compactAddText}>Add</Text>
              </Pressable>
            )}
          </View>

          <FormInput label="Search Products" icon="search-outline" value={query} onChangeText={setQuery} placeholder="Search by name, brand, supplier..." />

          <Text style={styles.filterTitle}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <ChipButton title="All" active={categoryFilter === 'all'} onPress={() => setCategoryFilter('all')} />
            {CATEGORIES.map((c) => (
              <ChipButton key={c} title={c} active={categoryFilter === c} onPress={() => setCategoryFilter(c)} />
            ))}
          </ScrollView>

          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={(p) => { setModalProduct(p); setModalOpen(true); }}
              onDelete={setDeleteTarget}
              isAdmin={isAdmin}
            />
          ))}
          {!filtered.length && (
            <Text style={styles.empty}>
              {products.length ? 'No products match the current filters.' : 'No products yet. Add your first product.'}
            </Text>
          )}
        </View>
      </ScrollView>

      <ProductModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={submitProduct}
        onImageUpload={handleImageUpload}
        initialProduct={modalProduct}
        loading={saving}
        uploadingImage={uploadingImage}
        suppliers={suppliers}
      />

      <DeleteProductModal
        product={deleteTarget}
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
  kicker: { color: colors.purple, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
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
  filterChipActive: { backgroundColor: colors.purple, borderColor: colors.purple },
  filterText: { color: colors.slate, fontWeight: '800', fontSize: 12 },
  filterTextActive: { color: '#fff' },
  productCard: { gap: 10, padding: 16, borderRadius: 26, marginBottom: 2 },
  productTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  productAvatar: { alignItems: 'center', justifyContent: 'center' },
  productName: { color: colors.slate, fontSize: 16, fontWeight: '900' },
  productMeta: { color: 'rgba(15,23,42,0.48)', fontSize: 12, fontWeight: '700', marginTop: 3 },
  stockPill: { overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, fontWeight: '900', fontSize: 10 },
  infoGrid: { flexDirection: 'row', gap: 8 },
  infoBox: { flex: 1, backgroundColor: 'rgba(15,23,42,0.04)', borderRadius: 18, padding: 11, borderWidth: 1, borderColor: colors.border },
  infoLabel: { color: 'rgba(15,23,42,0.42)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  infoValue: { color: colors.slate, fontSize: 16, fontWeight: '900', marginTop: 3 },
  priceMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  infoValueSub: { color: 'rgba(15,23,42,0.45)', fontSize: 10, fontWeight: '800', textDecorationLine: 'line-through' },
  discountPill: { overflow: 'hidden', color: colors.danger, backgroundColor: 'rgba(239,68,68,0.10)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, fontWeight: '900', fontSize: 10 },
  tagsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: { overflow: 'hidden', color: 'rgba(15,23,42,0.62)', backgroundColor: 'rgba(15,23,42,0.06)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontWeight: '900', fontSize: 11 },
  actionRow: { flexDirection: 'row', gap: 8 },
  smallBtn: { flex: 1, height: 40, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  smallBtnText: { color: colors.slate, fontWeight: '900', fontSize: 12 },
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
  imageUploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.65)' },
  imageUploadText: { flex: 1, color: colors.purple, fontWeight: '800', fontSize: 13 },
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
  supplierSelected: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13, borderRadius: 18, backgroundColor: `${colors.purple}12`, borderWidth: 1, borderColor: `${colors.purple}30` },
  supplierSelectedText: { flex: 1, color: colors.purple, fontWeight: '900', fontSize: 13 },
});
