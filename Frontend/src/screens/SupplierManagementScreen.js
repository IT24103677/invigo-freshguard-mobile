import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createSupplier, deleteSupplier, getSuppliers, updateSupplier } from '../api';
import Card from '../components/Card';
import FormInput from '../components/FormInput';
import PrimaryButton, { GhostButton } from '../components/PrimaryButton';
import Screen from '../components/Screen';
import WorkspaceHeader from '../components/WorkspaceHeader';
import { colors } from '../theme';

const CATEGORIES = ['Produce', 'Dairy', 'Bakery', 'Meat', 'Beverages', 'Dry Goods', 'Frozen', 'Other'];
const STATUSES = ['Active', 'Inactive'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+\d\s().-]{7,20}$/;

function getTodayDateOnly() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDateOnly(value) {
  const clean = String(value || '').trim();
  if (!clean) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return false;
  const date = new Date(`${clean}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === clean;
}

function isFutureDateOnly(value) {
  const clean = String(value || '').trim();
  if (!clean) return false;
  return clean > getTodayDateOnly();
}

function normalizeSupplierStatus(status) {
  return String(status || '').trim().toLowerCase() === 'active' ? 'Active' : 'Inactive';
}

function normaliseSupplier(raw) {
  const name = raw?.supplierName || raw?.name || 'Unnamed Supplier';
  return {
    ...raw,
    id: raw?.id || raw?._id || `${name}-${Date.now()}`,
    supplierName: name,
    contactPerson: raw?.contactPerson || '',
    productsSupplied: raw?.productsSupplied ?? 0,
    deliveryDays: raw?.deliveryDays != null ? String(raw.deliveryDays) : '',
    rating: raw?.rating != null ? String(raw.rating) : '',
    status: normalizeSupplierStatus(raw?.status),
    category: raw?.category || 'Produce',
    address: raw?.address || '',
    notes: raw?.notes || '',
    email: raw?.email || '',
    phone: raw?.phone || '',
    lastOrderDate: raw?.lastOrderDate || '',
  };
}

function toSupplierPayload(source) {
  return {
    supplierName: String(source.supplierName || '').trim(),
    name: String(source.supplierName || '').trim(),
    contactPerson: String(source.contactPerson || '').trim(),
    email: String(source.email || '').trim().toLowerCase(),
    phone: String(source.phone || '').trim(),
    category: source.category || 'Produce',
    status: normalizeSupplierStatus(source.status),
    deliveryDays: source.deliveryDays === '' || source.deliveryDays == null ? null : Number(source.deliveryDays),
    rating: source.rating === '' || source.rating == null ? null : Number(source.rating),
    productsSupplied: source.productsSupplied === '' || source.productsSupplied == null ? 0 : Number(source.productsSupplied),
    lastOrderDate: String(source.lastOrderDate || '').trim(),
    address: String(source.address || '').trim(),
    notes: String(source.notes || '').trim(),
  };
}

function statusColor(status) {
  const clean = String(status || '').toLowerCase();
  if (clean === 'active') return colors.emerald;
  return colors.danger;
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
        {options.map((option) => (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.option, value === option && { backgroundColor: activeColor, borderColor: activeColor }]}
          >
            <Text style={[styles.optionText, value === option && styles.optionTextActive]}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function SupplierCard({ supplier, onEdit, onDelete }) {
  const color = statusColor(supplier.status);

  return (
    <Card style={styles.supplierCard}>
      <View style={styles.supplierTop}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{String(supplier.supplierName || '?').slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.supplierName}>{supplier.supplierName}</Text>
          <Text style={styles.supplierMeta}>{supplier.contactPerson || 'No contact person'} | {supplier.category || 'General'}</Text>
        </View>
        <Text style={[styles.statusPill, { color, backgroundColor: `${color}16` }]}>{supplier.status || 'Active'}</Text>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Rating</Text>
          <Text style={styles.infoValue}>{supplier.rating || '--'}</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Delivery</Text>
          <Text style={styles.infoValue}>{supplier.deliveryDays ? `${supplier.deliveryDays}d` : '--'}</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Products</Text>
          <Text style={styles.infoValue}>{supplier.productsSupplied ?? 0}</Text>
        </View>
      </View>

      <View style={styles.contactBox}>
        <Text style={styles.contactText}><Ionicons name="mail-outline" size={13} color="rgba(15,23,42,0.45)" /> {supplier.email || 'No email'}</Text>
        <Text style={styles.contactText}><Ionicons name="call-outline" size={13} color="rgba(15,23,42,0.45)" /> {supplier.phone || 'No phone'}</Text>
        {!!supplier.address && <Text style={styles.contactText}><Ionicons name="location-outline" size={13} color="rgba(15,23,42,0.45)" /> {supplier.address}</Text>}
      </View>

      <View style={styles.tagsRow}>
        <Text style={styles.tag}>Last order {supplier.lastOrderDate || '--'}</Text>
        {!!supplier.notes && <Text style={styles.tag}>{supplier.notes}</Text>}
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.smallBtn} onPress={() => onEdit(supplier)} hitSlop={8}>
          <Text style={styles.smallBtnText}>Edit</Text>
        </Pressable>
        <Pressable style={styles.smallBtn} onPress={() => onDelete(supplier)} hitSlop={8}>
          <Text style={[styles.smallBtnText, { color: colors.danger }]}>
            Delete
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

function DeleteSupplierModal({ supplier, visible, loading, onCancel, onConfirm }) {
  if (!supplier) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.confirmBackdrop}>
        <View style={styles.confirmCard}>
          <View style={styles.confirmIconWrap}>
            <Ionicons name="trash-outline" size={28} color={colors.danger} />
          </View>
          <Text style={styles.confirmTitle}>Delete Supplier</Text>
          <Text style={styles.confirmText}>
            Delete {supplier.supplierName} permanently? This action cannot be undone.
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

function SupplierModal({ visible, onClose, onSubmit, initialSupplier, loading }) {
  const isEdit = Boolean(initialSupplier);
  const [form, setForm] = useState({
    supplierName: '',
    contactPerson: '',
    email: '',
    phone: '',
    category: 'Produce',
    status: 'Active',
    deliveryDays: '',
    rating: '',
    productsSupplied: '',
    lastOrderDate: '',
    address: '',
    notes: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;

    setError('');
    setForm(initialSupplier ? {
      supplierName: initialSupplier.supplierName || '',
      contactPerson: initialSupplier.contactPerson || '',
      email: initialSupplier.email || '',
      phone: initialSupplier.phone || '',
      category: initialSupplier.category || 'Produce',
      status: initialSupplier.status || 'Active',
      deliveryDays: initialSupplier.deliveryDays != null ? String(initialSupplier.deliveryDays) : '',
      rating: initialSupplier.rating != null ? String(initialSupplier.rating) : '',
      productsSupplied: initialSupplier.productsSupplied != null ? String(initialSupplier.productsSupplied) : '',
      lastOrderDate: initialSupplier.lastOrderDate || '',
      address: initialSupplier.address || '',
      notes: initialSupplier.notes || '',
    } : {
      supplierName: '',
      contactPerson: '',
      email: '',
      phone: '',
      category: 'Produce',
      status: 'Active',
      deliveryDays: '',
      rating: '',
      productsSupplied: '',
      lastOrderDate: '',
      address: '',
      notes: '',
    });
  }, [visible, initialSupplier]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    const cleanSupplierName = String(form.supplierName || '').trim();
    const cleanContactPerson = String(form.contactPerson || '').trim();
    const cleanEmail = String(form.email || '').trim().toLowerCase();
    const cleanPhone = String(form.phone || '').trim();
    const cleanLastOrderDate = String(form.lastOrderDate || '').trim();

    if (!cleanSupplierName) {
      setError('Supplier name is required.');
      return;
    }

    if (cleanSupplierName.length < 2) {
      setError('Supplier name must be at least 2 characters.');
      return;
    }

    if (!cleanContactPerson) {
      setError('Contact person is required.');
      return;
    }

    if (cleanContactPerson.length < 2) {
      setError('Contact person must be at least 2 characters.');
      return;
    }

    if (cleanEmail && !EMAIL_REGEX.test(cleanEmail)) {
      setError('Please enter a valid supplier email.');
      return;
    }

    if (cleanPhone && !PHONE_REGEX.test(cleanPhone)) {
      setError('Please enter a valid supplier phone number.');
      return;
    }

    const ratingNumber = Number(form.rating);
    if (form.rating && (Number.isNaN(ratingNumber) || ratingNumber < 0 || ratingNumber > 5)) {
      setError('Rating must be between 0 and 5.');
      return;
    }

    const deliveryNumber = Number(form.deliveryDays);
    if (form.deliveryDays && (!Number.isInteger(deliveryNumber) || deliveryNumber < 0)) {
      setError('Delivery days must be a whole number greater than or equal to 0.');
      return;
    }

    const productNumber = Number(form.productsSupplied);
    if (form.productsSupplied && (!Number.isInteger(productNumber) || productNumber < 0)) {
      setError('Products supplied must be a whole number greater than or equal to 0.');
      return;
    }

    if (!CATEGORIES.includes(form.category)) {
      setError('Please choose a valid supplier category.');
      return;
    }

    if (!STATUSES.includes(form.status)) {
      setError('Please choose a valid supplier status.');
      return;
    }

    if (!isValidDateOnly(cleanLastOrderDate)) {
      setError('Last order date must be a valid date in YYYY-MM-DD format.');
      return;
    }

    if (isFutureDateOnly(cleanLastOrderDate)) {
      setError('Last order date cannot be in the future.');
      return;
    }

    onSubmit({
      ...form,
      supplierName: cleanSupplierName,
      contactPerson: cleanContactPerson,
      email: cleanEmail,
      phone: cleanPhone,
      lastOrderDate: cleanLastOrderDate,
    }, initialSupplier);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalTop}>
            <Text style={styles.modalTitle}>{isEdit ? 'Edit Supplier' : 'Add Supplier'}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.slate} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {!!error && <Text style={styles.error}>{error}</Text>}
            <FormInput label="Supplier Name" icon="business-outline" value={form.supplierName} onChangeText={(value) => update('supplierName', value)} placeholder="Fresh Valley Farms" />
            <FormInput label="Contact Person" icon="person-outline" value={form.contactPerson} onChangeText={(value) => update('contactPerson', value)} placeholder="Supplier contact name" />
            <FormInput label="Email" icon="mail-outline" value={form.email} onChangeText={(value) => update('email', value)} placeholder="supplier@example.com" keyboardType="email-address" />
            <FormInput label="Phone" icon="call-outline" value={form.phone} onChangeText={(value) => update('phone', value)} placeholder="+94 77 123 4567" keyboardType="phone-pad" />
            <OptionSelector label="Category" options={CATEGORIES} value={form.category} onChange={(value) => update('category', value)} activeColor={colors.emerald} />
            <OptionSelector label="Status" options={STATUSES} value={form.status} onChange={(value) => update('status', value)} activeColor={statusColor(form.status)} />
            <FormInput label="Average Delivery Days" icon="time-outline" value={form.deliveryDays} onChangeText={(value) => update('deliveryDays', value)} placeholder="2" keyboardType="numeric" />
            <FormInput label="Rating" icon="star-outline" value={form.rating} onChangeText={(value) => update('rating', value)} placeholder="4.5" keyboardType="decimal-pad" />
            <FormInput label="Products Supplied" icon="cube-outline" value={form.productsSupplied} onChangeText={(value) => update('productsSupplied', value)} placeholder="18" keyboardType="numeric" />
            <FormInput label="Last Order Date" icon="calendar-outline" value={form.lastOrderDate} onChangeText={(value) => update('lastOrderDate', value)} placeholder="YYYY-MM-DD" />
            <FormInput label="Address" icon="location-outline" value={form.address} onChangeText={(value) => update('address', value)} placeholder="Supplier location" />
            <FormInput label="Notes" icon="document-text-outline" value={form.notes} onChangeText={(value) => update('notes', value)} placeholder="Short supplier note" multiline />
            <PrimaryButton title={isEdit ? 'Save Supplier' : 'Create Supplier'} onPress={submit} loading={loading} variant="purple" />
            <GhostButton title="Cancel" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function SupplierManagementScreen({ go, sessionUser, onLogout }) {
  const [suppliers, setSuppliers] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSupplier, setModalSupplier] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = String(sessionUser?.role || '').toUpperCase() === 'ADMIN';

  useEffect(() => {
    if (isAdmin) loadSuppliers();
  }, [isAdmin]);

  const filteredSuppliers = useMemo(() => {
    const search = query.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      const text = `${supplier.supplierName || ''} ${supplier.contactPerson || ''} ${supplier.email || ''} ${supplier.phone || ''} ${supplier.category || ''}`.toLowerCase();
      const matchesSearch = !search || text.includes(search);
      const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || supplier.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [suppliers, query, statusFilter, categoryFilter]);

  const activeCount = suppliers.filter((supplier) => String(supplier.status).toLowerCase() === 'active').length;
  const inactiveCount = suppliers.filter((supplier) => String(supplier.status).toLowerCase() !== 'active').length;
  const lowRatingCount = suppliers.filter((supplier) => Number(supplier.rating) > 0 && Number(supplier.rating) < 4).length;

  async function loadSuppliers() {
    setLoading(true);
    setError('');

    try {
      const data = await getSuppliers();
      const list = Array.isArray(data) ? data : data?.suppliers || data?.data || [];
      setSuppliers(list.map(normaliseSupplier));
    } catch (loadError) {
      setSuppliers([]);
      setError(loadError.message || 'Could not load supplier records.');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setModalSupplier(null);
    setModalOpen(true);
  }

  function openEdit(supplier) {
    setModalSupplier(supplier);
    setModalOpen(true);
  }

  async function submitSupplier(form, existingSupplier) {
    setSaving(true);

    try {
      const payload = toSupplierPayload(form);
      const savedSupplier = normaliseSupplier(
        existingSupplier
          ? await updateSupplier(existingSupplier.id, payload)
          : await createSupplier(payload)
      );

      setSuppliers((current) => (
        existingSupplier
          ? current.map((supplier) => (supplier.id === existingSupplier.id ? savedSupplier : supplier))
          : [savedSupplier, ...current]
      ));
      setModalOpen(false);
    } catch (saveError) {
      Alert.alert('Save failed', saveError.message || 'Could not save supplier.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteSupplier(supplier) {
    setDeleteTarget(supplier);
  }

  async function performDeleteSupplier() {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await deleteSupplier(deleteTarget.id);
      setSuppliers((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (updateError) {
      Alert.alert('Failed', updateError.message || 'Could not delete supplier.');
    } finally {
      setDeleting(false);
    }
  }

  if (!isAdmin) {
    return (
      <Screen scroll={false} style={{ paddingBottom: 0 }}>
        <WorkspaceHeader
          pillLabel="Supplier Management"
          pillIcon="business-outline"
          onLogout={onLogout}
        />
        <Card style={styles.restrictedCard}>
          <Text style={styles.sectionTitle}>Admin Access Required</Text>
          <Text style={styles.restrictedText}>
            Supplier management is currently available only to admin users in this mobile build.
          </Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} style={{ paddingBottom: 0 }}>
      <WorkspaceHeader
        pillLabel="Supplier Management"
        pillIcon="business-outline"
        onLogout={onLogout}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSuppliers} />}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        <View style={styles.adminHeader}>
          <Text style={styles.kicker}>Supplier Network</Text>

          <View style={styles.pageTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Suppliers</Text>
              <Text style={styles.sub}>
                Add, update, filter, and monitor supplier records.
              </Text>
            </View>
          </View>
        </View>

        {!!error && <Text style={styles.warn}>{error}</Text>}

        <View style={styles.statsGrid}>
          <Stat label="Active" value={activeCount} icon="checkmark-circle-outline" color={colors.emerald} />
          <Stat label="Inactive" value={inactiveCount} icon="close-circle-outline" color={colors.danger} />
          <Stat label="Low Rating" value={lowRatingCount} icon="warning-outline" color={colors.danger} />
        </View>

        <View style={styles.sectionGap}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Supplier Directory</Text>
              <Text style={styles.sectionSub}>{filteredSuppliers.length} suppliers found</Text>
            </View>

            <Pressable style={styles.compactAddBtn} onPress={openCreate}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.compactAddText}>Add</Text>
            </Pressable>
          </View>

          <FormInput label="Search Suppliers" icon="search-outline" value={query} onChangeText={setQuery} placeholder="Search by supplier, contact, email, or category" />

          <Text style={styles.filterTitle}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <ChipButton title="All" active={statusFilter === 'all'} onPress={() => setStatusFilter('all')} />
            {STATUSES.map((status) => (
              <ChipButton key={status} title={status} active={statusFilter === status} onPress={() => setStatusFilter(status)} />
            ))}
          </ScrollView>

          <Text style={styles.filterTitle}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <ChipButton title="All" active={categoryFilter === 'all'} onPress={() => setCategoryFilter('all')} />
            {CATEGORIES.map((category) => (
              <ChipButton key={category} title={category} active={categoryFilter === category} onPress={() => setCategoryFilter(category)} />
            ))}
          </ScrollView>

          {filteredSuppliers.map((supplier) => (
            <SupplierCard key={supplier.id || supplier.supplierName} supplier={supplier} onEdit={openEdit} onDelete={confirmDeleteSupplier} />
          ))}
          {!filteredSuppliers.length && (
            <Text style={styles.empty}>
              {suppliers.length ? 'No suppliers match the current filters.' : 'No suppliers available yet.'}
            </Text>
          )}
        </View>
      </ScrollView>

      <SupplierModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={submitSupplier}
        initialSupplier={modalSupplier}
        loading={saving}
      />

      <DeleteSupplierModal
        supplier={deleteTarget}
        visible={!!deleteTarget}
        loading={deleting}
        onCancel={() => !deleting && setDeleteTarget(null)}
        onConfirm={performDeleteSupplier}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  adminHeader: { marginTop: 4, marginBottom: 18 },
  kicker: { color: colors.emerald, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  title: { color: colors.slate, fontSize: 31, fontWeight: '900', letterSpacing: -1.2 },
  sub: { color: 'rgba(15,23,42,0.58)', fontWeight: '700', lineHeight: 22, marginTop: 8 },
  warn: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', color: '#92400E', padding: 12, borderRadius: 16, fontWeight: '800', marginBottom: 14 },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 12 },
  statIcon: { width: 36, height: 36, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { color: colors.slate, fontSize: 24, fontWeight: '900' },
  statLabel: { color: 'rgba(15,23,42,0.48)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  sectionGap: { gap: 12 },
  filterTitle: { color: colors.slate, fontWeight: '900', fontSize: 13, marginTop: 4 },
  filterRow: { gap: 8, paddingVertical: 2 },
  filterChip: { paddingHorizontal: 13, height: 38, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { backgroundColor: colors.purple, borderColor: colors.purple },
  filterText: { color: colors.slate, fontWeight: '800', fontSize: 12 },
  filterTextActive: { color: '#fff' },
  supplierCard: { gap: 12, padding: 16, borderRadius: 26, marginBottom: 2 },
  supplierTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '900' },
  supplierName: { color: colors.slate, fontSize: 16, fontWeight: '900' },
  supplierMeta: { color: 'rgba(15,23,42,0.48)', fontSize: 12, fontWeight: '700', marginTop: 3, lineHeight: 18 },
  statusPill: { overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, fontWeight: '900', fontSize: 10 },
  infoGrid: { flexDirection: 'row', gap: 8 },
  infoBox: { flex: 1, backgroundColor: 'rgba(15,23,42,0.04)', borderRadius: 18, padding: 11, borderWidth: 1, borderColor: colors.border },
  infoLabel: { color: 'rgba(15,23,42,0.42)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  infoValue: { color: colors.slate, fontSize: 18, fontWeight: '900', marginTop: 3 },
  contactBox: { gap: 5 },
  contactText: { color: 'rgba(15,23,42,0.52)', fontWeight: '700', fontSize: 12, lineHeight: 18 },
  tagsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: { overflow: 'hidden', color: 'rgba(15,23,42,0.62)', backgroundColor: 'rgba(15,23,42,0.06)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontWeight: '900', fontSize: 11 },
  actionRow: { flexDirection: 'row', gap: 8 },
  smallBtn: { flex: 1, height: 40, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  smallBtnText: { color: colors.slate, fontWeight: '900', fontSize: 12 },
  empty: { color: 'rgba(15,23,42,0.5)', fontWeight: '800', textAlign: 'center', paddingVertical: 18 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '88%', backgroundColor: colors.background, borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: 20 },
  confirmBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 20 },
  confirmCard: { backgroundColor: colors.background, borderRadius: 30, padding: 22, gap: 14, borderWidth: 1, borderColor: colors.border },
  confirmIconWrap: { width: 64, height: 64, borderRadius: 24, backgroundColor: 'rgba(239,68,68,0.12)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  confirmTitle: { color: colors.slate, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  confirmText: { color: 'rgba(15,23,42,0.58)', fontWeight: '700', lineHeight: 22, textAlign: 'center' },
  confirmActions: { gap: 10, marginTop: 4 },
  confirmDeleteBtn: { backgroundColor: colors.danger },
  modalTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle: { color: colors.slate, fontSize: 23, fontWeight: '900' },
  closeBtn: { width: 42, height: 42, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  error: { backgroundColor: '#FEF2F2', color: colors.danger, borderWidth: 1, borderColor: '#FECACA', padding: 12, borderRadius: 16, textAlign: 'center', fontWeight: '800' },
  smallLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(15,23,42,0.45)', marginBottom: 8 },
  optionWrap: { gap: 4 },
  optionGrid: { gap: 8 },
  option: { padding: 13, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.68)' },
  optionText: { color: colors.slate, fontWeight: '900' },
  optionTextActive: { color: '#fff' },
  pageTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, marginBottom: 2 },
  sectionSub: { color: 'rgba(15,23,42,0.46)', fontSize: 12, fontWeight: '800', marginTop: 3 },
  compactAddBtn: { height: 42, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.slate, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  compactAddText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  restrictedCard: { marginTop: 20 },
  restrictedText: { marginTop: 8, color: 'rgba(15,23,42,0.58)', fontWeight: '700', lineHeight: 22 },
  sectionTitle: { color: colors.slate, fontSize: 20, fontWeight: '900', marginTop: 4 },
});
