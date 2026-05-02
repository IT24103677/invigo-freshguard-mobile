import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSaleById, updateSale, uploadSaleReceipt, voidSale } from '../../api';
import WorkspaceHeader from '../../components/WorkspaceHeader';
import SalesProductImage from '../../sales/components/SalesProductImage';
import { salesColors } from '../../sales/theme';
import { formatDate, formatDateTime, formatMoney, isValidEmail, normalizeCustomerName } from '../../sales/utils';
import { colors } from '../../theme';

export default function SaleDetailsScreen({ saleId, sessionUser, onLogout, onBack }) {
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [voidingSale, setVoidingSale] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showVoid, setShowVoid] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    notes: '',
    editReason: '',
    voidReason: '',
  });

  const canVoid = String(sessionUser?.role || '').toUpperCase() === 'ADMIN' && sale?.status === 'ACTIVE';
  const canEdit = sale?.status === 'ACTIVE';

  const loadSale = useCallback(async (isRefresh = false) => {
    if (!saleId) {
      setErrorMsg('Sale id is missing.');
      setLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMsg('');
      const data = await getSaleById(saleId);
      setSale(data);
      setForm((current) => ({
        ...current,
        customerName: data.customerName || '',
        customerEmail: data.customerEmail || '',
        notes: data.notes || '',
      }));
    } catch (error) {
      setErrorMsg(error.message || 'Failed to load sale details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [saleId]);

  useEffect(() => {
    loadSale();
  }, [loadSale]);

  async function pickReceipt(source) {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setErrorMsg('Camera permission is required to capture a receipt.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.length) {
        await saveReceipt(result.assets[0]);
      }
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMsg('Gallery permission is required to attach a receipt.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length) {
      await saveReceipt(result.assets[0]);
    }
  }

  function attachReceipt() {
    Alert.alert(
      sale?.receiptImageUrl ? 'Replace Receipt' : 'Attach Receipt',
      'Choose how you want to add the receipt image.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera', onPress: () => pickReceipt('camera') },
        { text: 'Gallery', onPress: () => pickReceipt('gallery') },
      ]
    );
  }

  async function saveReceipt(asset) {
    try {
      setUploadingReceipt(true);
      await uploadSaleReceipt(sale.id, asset);
      await loadSale(true);
    } catch (error) {
      setErrorMsg(error.message || 'Receipt upload could not be completed. Please try again.');
    } finally {
      setUploadingReceipt(false);
    }
  }

  async function saveEdits() {
    if (!form.editReason.trim()) {
      setErrorMsg('Edit reason is required.');
      return;
    }

    if (String(form.customerEmail || '').trim() && !isValidEmail(form.customerEmail)) {
      setErrorMsg('Customer email must be valid before saving sale changes.');
      return;
    }

    try {
      setSavingEdit(true);
      setErrorMsg('');
      await updateSale(sale.id, {
        customerName: normalizeCustomerName(form.customerName) || undefined,
        customerEmail: String(form.customerEmail || '').trim() || undefined,
        notes: String(form.notes || '').trim() || undefined,
        editReason: form.editReason.trim(),
      });
      setShowEdit(false);
      setForm((current) => ({ ...current, editReason: '' }));
      await loadSale(true);
    } catch (error) {
      setErrorMsg(error.message || 'Failed to update sale.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmVoidSale() {
    if (!form.voidReason.trim()) {
      setErrorMsg('Void reason is required.');
      return;
    }

    try {
      setVoidingSale(true);
      setErrorMsg('');
      await voidSale(sale.id, form.voidReason.trim());
      setShowVoid(false);
      setForm((current) => ({ ...current, voidReason: '' }));
      await loadSale(true);
    } catch (error) {
      setErrorMsg(error.message || 'Failed to void sale.');
    } finally {
      setVoidingSale(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator color={salesColors.primary} />
          <Text style={styles.loadingText}>Loading sale...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!sale) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMsg || 'Sale unavailable.'}</Text>
          <Pressable onPress={onBack} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSale(true)} />}
      >
        <WorkspaceHeader
          pillLabel="Sale Details"
          pillIcon="document-text-outline"
          onLogout={onLogout}
          onBack={onBack}
        />

        <View style={styles.heroCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroEyebrow}>Sales Receipt</Text>
            <Text style={styles.heroTitle}>{sale.saleGroupId}</Text>
            <Text style={styles.heroMeta}>{formatDateTime(sale.saleDateTime)}</Text>
          </View>
          <View style={[styles.statusBadge, sale.status === 'VOID' ? styles.statusBadgeVoid : styles.statusBadgeActive]}>
            <Text style={[styles.statusBadgeText, sale.status === 'VOID' ? styles.statusBadgeTextVoid : styles.statusBadgeTextActive]}>
              {sale.status}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <SummaryRow label="Subtotal" value={formatMoney(sale.subTotal)} />
          <SummaryRow label="Discount" value={formatMoney(sale.discountTotal)} />
          <SummaryRow label="Grand Total" value={formatMoney(sale.grandTotal)} strong />
          {sale.amountGiven != null ? <SummaryRow label="Paid" value={formatMoney(sale.amountGiven)} /> : null}
          {sale.changeGiven != null ? <SummaryRow label="Change" value={formatMoney(sale.changeGiven)} /> : null}
        </View>

        <Section title="Items Sold">
          {(sale.items || []).map((item, index) => (
            <View key={`${item.productId}-${index}`} style={styles.itemCard}>
              <SalesProductImage
                imageUrl={null}
                productName={item.productNameSnapshot}
                category="default"
                size={50}
                borderRadius={12}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.productNameSnapshot}</Text>
                <Text style={styles.itemMeta}>
                  {item.quantity} x {formatMoney(item.unitPriceSnapshot)}
                </Text>
                {item.discountRateApplied > 0 ? (
                  <Text style={styles.itemMeta}>Discount {item.discountRateApplied}%</Text>
                ) : null}
              </View>
              <Text style={styles.itemTotal}>{formatMoney(item.lineTotal)}</Text>
            </View>
          ))}
        </Section>

        <Section title="Customer and Notes">
          <InfoRow label="Customer Name" value={sale.customerName || '--'} />
          <InfoRow label="Customer Email" value={sale.customerEmail || '--'} />
          <InfoRow label="Notes" value={sale.notes || '--'} />
        </Section>

        <Section title="Receipt Attachment">
          {sale.receiptImageUrl ? (
            <Image source={{ uri: sale.receiptImageUrl }} style={styles.receiptImage} resizeMode="cover" />
          ) : (
            <View style={styles.emptyReceipt}>
              <MaterialCommunityIcons name="receipt-text-plus-outline" size={28} color={salesColors.outline} />
              <Text style={styles.itemMeta}>No receipt image uploaded for this sale yet.</Text>
            </View>
          )}
          <Pressable onPress={attachReceipt} style={styles.secondaryBtn}>
            {uploadingReceipt ? (
              <ActivityIndicator size="small" color={salesColors.primary} />
            ) : (
              <>
                <MaterialCommunityIcons name="receipt-text-plus-outline" size={18} color={salesColors.primary} />
                <Text style={styles.secondaryBtnText}>{sale.receiptImageUrl ? 'Replace Receipt' : 'Attach Receipt'}</Text>
              </>
            )}
          </Pressable>
        </Section>

        <Section title="Audit Trail">
          <InfoRow label="Recorded By" value={formatAuditUser(sale.recordedBy)} />
          <InfoRow label="Edited By" value={formatAuditUser(sale.editedBy)} />
          <InfoRow label="Edited At" value={sale.editedAt ? formatDateTime(sale.editedAt) : '--'} />
          <InfoRow label="Edit Reason" value={sale.editReason || '--'} />
          <InfoRow label="Voided By" value={formatAuditUser(sale.voidedBy)} />
          <InfoRow label="Voided At" value={sale.voidedAt ? formatDateTime(sale.voidedAt) : '--'} />
          <InfoRow label="Void Reason" value={sale.voidReason || '--'} />
        </Section>

        {canEdit ? (
          <Section title="Update Sale">
            {!showEdit ? (
              <Pressable onPress={() => setShowEdit(true)} style={styles.secondaryBtn}>
                <MaterialCommunityIcons name="pencil-outline" size={18} color={salesColors.primary} />
                <Text style={styles.secondaryBtnText}>Edit Customer Details</Text>
              </Pressable>
            ) : (
              <View style={styles.formCard}>
                <InputField label="Customer Name" value={form.customerName} onChangeText={(value) => setForm((current) => ({ ...current, customerName: value }))} />
                <InputField label="Customer Email" value={form.customerEmail} onChangeText={(value) => setForm((current) => ({ ...current, customerEmail: value }))} />
                <InputField label="Notes" value={form.notes} multiline onChangeText={(value) => setForm((current) => ({ ...current, notes: value }))} />
                <InputField label="Edit Reason" value={form.editReason} onChangeText={(value) => setForm((current) => ({ ...current, editReason: value }))} />
                <View style={styles.actionRow}>
                  <Pressable onPress={() => setShowEdit(false)} style={styles.ghostBtn}>
                    <Text style={styles.ghostBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={saveEdits} style={styles.primaryBtn}>
                    {savingEdit ? <ActivityIndicator size="small" color={salesColors.white} /> : <Text style={styles.primaryBtnText}>Save Changes</Text>}
                  </Pressable>
                </View>
              </View>
            )}
          </Section>
        ) : null}

        {canVoid ? (
          <Section title="Admin Action">
            {!showVoid ? (
              <Pressable onPress={() => setShowVoid(true)} style={styles.voidBtn}>
                <Text style={styles.voidBtnText}>Void This Sale</Text>
              </Pressable>
            ) : (
              <View style={styles.formCard}>
                <InputField label="Void Reason" value={form.voidReason} multiline onChangeText={(value) => setForm((current) => ({ ...current, voidReason: value }))} />
                <View style={styles.actionRow}>
                  <Pressable onPress={() => setShowVoid(false)} style={styles.ghostBtn}>
                    <Text style={styles.ghostBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={confirmVoidSale} style={styles.voidBtn}>
                    {voidingSale ? <ActivityIndicator size="small" color={salesColors.white} /> : <Text style={styles.voidBtnText}>Confirm Void</Text>}
                  </Pressable>
                </View>
              </View>
            )}
          </Section>
        ) : null}

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatAuditUser(user) {
  if (!user) return '--';
  if (typeof user === 'string') return user;
  return `${user.name || user.email || 'User'}${user.role ? ` (${user.role})` : ''}`;
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.rowStrong]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowStrong]}>{value}</Text>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function InputField({ label, multiline = false, ...props }) {
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.inputTall]}
        placeholderTextColor={salesColors.outline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120, gap: 14 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 14, color: salesColors.textMuted },
  heroCard: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, padding: 18, borderRadius: 20, backgroundColor: salesColors.primaryContainer },
  heroEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: salesColors.primary },
  heroTitle: { marginTop: 4, fontSize: 24, fontWeight: '900', color: colors.slate, letterSpacing: -0.6 },
  heroMeta: { marginTop: 4, fontSize: 13, color: salesColors.textMuted },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  statusBadgeActive: { backgroundColor: salesColors.surface },
  statusBadgeVoid: { backgroundColor: salesColors.tertiaryContainer },
  statusBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  statusBadgeTextActive: { color: salesColors.primary },
  statusBadgeTextVoid: { color: salesColors.terracotta },
  summaryCard: { backgroundColor: salesColors.surface, borderRadius: 16, padding: 14, gap: 8, borderWidth: 1, borderColor: `${salesColors.outlineVariant}88` },
  section: { backgroundColor: salesColors.surface, borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: `${salesColors.outlineVariant}88` },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.slate },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: salesColors.surfaceLow },
  itemName: { fontSize: 14, fontWeight: '700', color: salesColors.text },
  itemMeta: { fontSize: 12, color: salesColors.textMuted },
  itemTotal: { fontSize: 14, fontWeight: '800', color: salesColors.primary },
  receiptImage: { width: '100%', height: 220, borderRadius: 12, backgroundColor: salesColors.surfaceHighest },
  emptyReceipt: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20, borderRadius: 12, backgroundColor: salesColors.surfaceLow },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: salesColors.textMuted },
  rowValue: { flex: 1, fontSize: 13, textAlign: 'right', color: salesColors.text },
  rowStrong: { fontSize: 15, fontWeight: '800', color: salesColors.primary },
  secondaryBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: `${salesColors.primaryContainer}55`, borderWidth: 1, borderColor: salesColors.primaryContainer },
  secondaryBtnText: { fontSize: 13, fontWeight: '700', color: salesColors.primary },
  formCard: { gap: 12 },
  inputBlock: { gap: 6 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: salesColors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { minHeight: 46, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: salesColors.outlineVariant, backgroundColor: salesColors.surfaceLow, fontSize: 14, color: salesColors.text },
  inputTall: { minHeight: 90 },
  actionRow: { flexDirection: 'row', gap: 10 },
  ghostBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: salesColors.surfaceLow },
  ghostBtnText: { fontSize: 14, fontWeight: '700', color: salesColors.textMuted },
  primaryBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: salesColors.primary },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: salesColors.white },
  voidBtn: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: salesColors.terracotta },
  voidBtnText: { fontSize: 14, fontWeight: '700', color: salesColors.white },
  errorText: { fontSize: 13, lineHeight: 19, color: salesColors.terracotta, fontWeight: '600' },
});
