import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createSale, getProducts, uploadSaleReceipt } from '../../api';
import WorkspaceHeader from '../../components/WorkspaceHeader';
import { usePosCart } from '../../context/posCart';
import SalesCartItem from '../../sales/components/SalesCartItem';
import { salesColors } from '../../sales/theme';
import {
  buildProductsMap,
  formatMoney,
  generateClientRequestKey,
  getCartStockIssues,
  isValidEmail,
  normalizeCustomerName,
} from '../../sales/utils';
import { colors } from '../../theme';

export default function SalesCheckoutScreen({ onLogout, onBack, onBackToPos, onOpenSaleDetails }) {
  const {
    cart,
    checkoutDraft,
    updateQuantity,
    updateDiscount,
    removeProduct,
    setCheckoutDraft,
    clearBill,
  } = usePosCart();
  const [submitting, setSubmitting] = useState(false);
  const [refreshingStock, setRefreshingStock] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [clientRequestKey, setClientRequestKey] = useState(() => generateClientRequestKey());
  const [latestProducts, setLatestProducts] = useState({});
  const [hasStockSnapshot, setHasStockSnapshot] = useState(false);

  const { amountGiven, customerName, customerEmail, notes, receiptAsset } = checkoutDraft;
  const cartSubtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0), [cart]);
  const cartDiscount = useMemo(
    () => cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.discountRate / 100)), 0),
    [cart]
  );
  const grandTotal = +(cartSubtotal - cartDiscount).toFixed(2);
  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  const normalizedCustomer = normalizeCustomerName(customerName);
  const trimmedEmail = String(customerEmail || '').trim();
  const parsedAmount = String(amountGiven || '').trim() ? parseFloat(amountGiven) : null;
  const changePreview = parsedAmount != null && !Number.isNaN(parsedAmount)
    ? +(parsedAmount - grandTotal).toFixed(2)
    : null;
  const emailInvalid = trimmedEmail.length > 0 && !isValidEmail(trimmedEmail);
  const hasPreservedDraftDetails = Boolean(
    normalizedCustomer
      || trimmedEmail
      || String(notes || '').trim()
      || receiptAsset
      || String(amountGiven || '').trim()
  );
  const stockIssues = useMemo(
    () => (hasStockSnapshot ? getCartStockIssues(cart, latestProducts) : []),
    [cart, hasStockSnapshot, latestProducts]
  );

  const canSubmit = cart.length > 0
    && !submitting
    && !refreshingStock
    && hasStockSnapshot
    && stockIssues.length === 0
    && String(amountGiven || '').trim()
    && !Number.isNaN(parsedAmount ?? Number.NaN)
    && (parsedAmount ?? 0) >= grandTotal
    && !emailInvalid;

  const refreshStock = useCallback(async () => {
    setRefreshingStock(true);
    try {
      const products = await getProducts();
      const map = buildProductsMap(products);
      setLatestProducts(map);
      setHasStockSnapshot(true);
      return map;
    } catch (error) {
      setErrorMsg(error.message || 'Could not refresh live stock.');
      return null;
    } finally {
      setRefreshingStock(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshStock();
    }, [refreshStock])
  );

  function resetCheckoutState() {
    clearBill();
    setClientRequestKey(generateClientRequestKey());
    setErrorMsg('');
  }

  function changeQuantity(productId, delta) {
    if (delta <= 0) {
      updateQuantity(productId, delta);
      return;
    }

    const currentItem = cart.find((item) => item.productId === productId);
    const latestProduct = latestProducts[productId];
    const allowed = Math.max(0, Number(latestProduct?.sellableUnits ?? Number.MAX_SAFE_INTEGER));
    if (currentItem && currentItem.quantity >= allowed) {
      setErrorMsg(`${latestProduct?.name || currentItem.productName} already matches the latest sellable stock limit.`);
      return;
    }
    updateQuantity(productId, delta);
  }

  function autoAdjustBill() {
    stockIssues.forEach((issue) => {
      if (issue.allowedQuantity <= 0) {
        removeProduct(issue.productId);
      } else {
        updateQuantity(issue.productId, -(issue.currentQuantity - issue.allowedQuantity));
      }
    });
    setErrorMsg('');
  }

  function handleClearBill() {
    const runClear = () => {
      resetCheckoutState();
      onBackToPos();
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof globalThis.confirm === 'function'
        ? globalThis.confirm('Remove all items from this bill?')
        : true;

      if (confirmed) {
        runClear();
      }
      return;
    }

    Alert.alert('Clear Bill', 'Remove all items from this bill?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear Bill',
        style: 'destructive',
        onPress: runClear,
      },
    ]);
  }

  function handleSaleRecordedSuccess(sale, receiptUploadFailed = false) {
    const title = receiptUploadFailed ? 'Sale Recorded - Receipt Pending' : 'Sale Recorded';
    const summary = `${sale.saleGroupId}\nTotal: ${formatMoney(sale.grandTotal)}\nChange: ${formatMoney(sale.changeGiven || 0)}`;

    resetCheckoutState();

    if (Platform.OS === 'web') {
      const prompt = [
        receiptUploadFailed
          ? 'The sale was recorded, but the receipt still needs to upload.'
          : 'The sale was recorded successfully.',
        '',
        summary,
        '',
        'Press OK to open the sale details or Cancel to return to POS.',
      ].join('\n');

      const openDetails = typeof globalThis.confirm === 'function'
        ? globalThis.confirm(prompt)
        : false;

      if (openDetails) {
        onOpenSaleDetails(sale.id, true);
        return;
      }

      onBackToPos();
      return;
    }

    Alert.alert(title, summary, [
      {
        text: 'Open Details',
        onPress: () => onOpenSaleDetails(sale.id, true),
      },
      {
        text: 'Back to POS',
        onPress: () => onBackToPos(),
      },
    ]);
  }

  async function chooseReceipt(source) {
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
        setCheckoutDraft({ receiptAsset: result.assets[0] });
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
      setCheckoutDraft({ receiptAsset: result.assets[0] });
    }
  }

  function attachReceipt() {
    Alert.alert('Attach Receipt', 'Choose how you want to add the receipt image.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Camera', onPress: () => chooseReceipt('camera') },
      { text: 'Gallery', onPress: () => chooseReceipt('gallery') },
    ]);
  }

  async function recordSale() {
    if (!String(amountGiven || '').trim()) {
      setErrorMsg('Amount given is required before recording the sale.');
      return;
    }
    if (Number.isNaN(parsedAmount ?? Number.NaN) || (parsedAmount ?? 0) < 0) {
      setErrorMsg('Amount given must be a valid non-negative number.');
      return;
    }
    if ((parsedAmount ?? 0) < grandTotal) {
      setErrorMsg('Amount given cannot be less than the grand total.');
      return;
    }
    if (emailInvalid) {
      setErrorMsg('Customer email must be valid before recording the sale.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const latestMap = await refreshStock();
      if (!latestMap) return;
      const latestIssues = getCartStockIssues(cart, latestMap);
      if (latestIssues.length > 0) {
        setErrorMsg(`${latestIssues[0].productName} changed stock while this bill was open. Review the bill and try again.`);
        return;
      }

      const sale = await createSale({
        clientRequestKey,
        customerName: normalizedCustomer || undefined,
        customerEmail: trimmedEmail || undefined,
        notes: String(notes || '').trim() || undefined,
        amountGiven: parsedAmount,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPriceOverride: item.unitPrice,
          discountRateApplied: item.discountRate,
        })),
      });

      let receiptUploadFailed = false;
      if (receiptAsset) {
        try {
          await uploadSaleReceipt(sale.id, receiptAsset);
        } catch (error) {
          receiptUploadFailed = true;
        }
      }

      handleSaleRecordedSuccess(sale, receiptUploadFailed);
    } catch (error) {
      setErrorMsg(error.message || 'Failed to record sale.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <WorkspaceHeader
            pillLabel="Checkout"
            pillIcon="receipt-outline"
            onLogout={onLogout}
            onBack={onBack}
          />

          <View style={styles.totalCard}>
            <Text style={styles.totalEyebrow}>Ready to complete</Text>
            <Text style={styles.totalUnits}>{totalUnits} {totalUnits === 1 ? 'unit' : 'units'} in bill</Text>
            <Text style={styles.totalAmount}>{formatMoney(grandTotal)}</Text>
          </View>

          <View style={styles.liveCard}>
            <View style={styles.liveHeader}>
              <View style={styles.liveHeaderLeft}>
                <MaterialCommunityIcons name="database-refresh-outline" size={16} color={salesColors.primary} />
                <Text style={styles.liveTitle}>Live Stock Check</Text>
              </View>
              <Pressable onPress={refreshStock} style={styles.refreshBtn}>
                {refreshingStock ? <ActivityIndicator size="small" color={salesColors.primary} /> : <Text style={styles.refreshText}>Refresh</Text>}
              </Pressable>
            </View>
            <Text style={styles.liveBody}>
              {!hasStockSnapshot
                ? 'Checking the latest sellable stock before this bill can be completed.'
                : stockIssues.length === 0
                  ? 'This bill matches the latest sellable stock.'
                  : 'Some items changed while this bill was open. Adjust them before recording the sale.'}
            </Text>
            {stockIssues.length > 0 ? (
              <>
                {stockIssues.map((issue) => (
                  <View key={issue.productId} style={styles.issueCard}>
                    <Text style={styles.issueTitle}>{issue.productName}</Text>
                    <Text style={styles.issueBody}>
                      {issue.reason} In bill: {issue.currentQuantity}. Allowed now: {issue.allowedQuantity}.
                    </Text>
                  </View>
                ))}
                <Pressable onPress={autoAdjustBill} style={styles.primaryMiniBtn}>
                  <Text style={styles.primaryMiniBtnText}>Auto Adjust Bill</Text>
                </Pressable>
              </>
            ) : null}
          </View>

          <View style={styles.actionStrip}>
            <Pressable onPress={onBackToPos} style={styles.secondaryBtn}>
              <MaterialCommunityIcons name="playlist-plus" size={18} color={salesColors.primary} />
              <Text style={styles.secondaryBtnText}>Add More Items</Text>
            </Pressable>
            <Pressable onPress={handleClearBill} style={styles.dangerBtn}>
              <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
              <Text style={styles.dangerBtnText}>Clear Bill</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Bill Items</Text>
          {cart.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>This bill is empty.</Text>
              <Text style={styles.emptyBody}>Go back to POS and add products to continue checkout.</Text>
            </View>
          ) : (
            cart.map((item) => (
              <SalesCartItem
                key={item.productId}
                item={item}
                onUpdateQuantity={changeQuantity}
                onUpdateDiscount={updateDiscount}
                onRemove={removeProduct}
              />
            ))
          )}

          <View style={styles.summaryCard}>
            <Row label="Subtotal" value={formatMoney(cartSubtotal)} />
            <Row label="Discount" value={`-${formatMoney(cartDiscount)}`} />
            <View style={styles.divider} />
            <Row label="Grand Total" value={formatMoney(grandTotal)} strong />
            {changePreview != null && !Number.isNaN(changePreview) ? (
              <Row label="Change Preview" value={formatMoney(changePreview)} danger={changePreview < 0} />
            ) : null}
          </View>

          <Text style={styles.sectionEyebrow}>Customer Details</Text>
          <InputField icon="account-outline" value={customerName} placeholder="Customer name (optional)" onChangeText={(value) => setCheckoutDraft({ customerName: value })} />
          <InputField icon="email-outline" value={customerEmail} placeholder="Customer email (optional)" onChangeText={(value) => setCheckoutDraft({ customerEmail: value })} keyboardType="email-address" autoCapitalize="none" />
          {emailInvalid ? <Text style={styles.errorHint}>Enter a valid email address or clear this field.</Text> : null}

          <Text style={styles.sectionEyebrow}>Payment and Notes</Text>
          <InputField icon="cash" value={amountGiven} placeholder="Amount given *" onChangeText={(value) => setCheckoutDraft({ amountGiven: value })} keyboardType="decimal-pad" />
          <InputField icon="note-text-outline" value={notes} placeholder="Notes (optional)" onChangeText={(value) => setCheckoutDraft({ notes: value })} multiline />

          <Text style={styles.sectionEyebrow}>Receipt Attachment</Text>
          <View style={styles.receiptCard}>
            <Text style={styles.receiptText}>
              {receiptAsset
                ? 'Receipt image selected. It will upload after this sale is recorded.'
                : 'Optionally attach a receipt photo from the camera or gallery.'}
            </Text>
            <View style={styles.receiptActions}>
              <Pressable onPress={attachReceipt} style={styles.secondaryBtn}>
                <MaterialCommunityIcons name="receipt-text-plus-outline" size={18} color={salesColors.primary} />
                <Text style={styles.secondaryBtnText}>{receiptAsset ? 'Replace Receipt' : 'Attach Receipt'}</Text>
              </Pressable>
              {receiptAsset ? (
                <Pressable onPress={() => setCheckoutDraft({ receiptAsset: null })} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
            {receiptAsset ? <Image source={{ uri: receiptAsset.uri }} style={styles.receiptPreview} resizeMode="cover" /> : null}
          </View>

          {hasPreservedDraftDetails ? (
            <Text style={styles.helperText}>
              Your customer details, payment, notes, and receipt stay with this bill while you continue shopping.
            </Text>
          ) : null}

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <Pressable onPress={recordSale} disabled={!canSubmit} style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}>
            {submitting ? <ActivityIndicator color={salesColors.white} /> : <Text style={styles.submitBtnText}>Record Sale - {formatMoney(grandTotal)}</Text>}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function Row({ label, value, strong = false, danger = false }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.rowStrong]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowStrong, danger && styles.rowDanger]}>{value}</Text>
    </View>
  );
}

function InputField(props) {
  const { icon, multiline, ...inputProps } = props;
  return (
    <View style={[styles.inputWrap, multiline && styles.inputWrapTall]}>
      <MaterialCommunityIcons name={icon} size={16} color={salesColors.primary} />
      <TextInput
        {...inputProps}
        style={[styles.input, multiline && styles.inputTall]}
        placeholderTextColor={salesColors.outline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120, gap: 12 },
  totalCard: { backgroundColor: salesColors.primaryContainer, borderRadius: 18, padding: 18, gap: 4 },
  totalEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: salesColors.primary },
  totalUnits: { fontSize: 22, fontWeight: '800', color: salesColors.text },
  totalAmount: { fontSize: 28, fontWeight: '800', color: salesColors.primary },
  liveCard: { backgroundColor: salesColors.surfaceLow, borderRadius: 14, borderWidth: 1, borderColor: salesColors.outlineVariant, padding: 14, gap: 10 },
  liveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  liveHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveTitle: { fontSize: 13, fontWeight: '700', color: salesColors.primary },
  refreshBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: `${salesColors.primaryContainer}55`, borderWidth: 1, borderColor: salesColors.primaryContainer },
  refreshText: { fontSize: 12, fontWeight: '700', color: salesColors.primary },
  liveBody: { fontSize: 13, lineHeight: 19, color: salesColors.textMuted },
  issueCard: { backgroundColor: `${salesColors.tertiaryContainer}55`, borderRadius: 12, padding: 12, gap: 4 },
  issueTitle: { fontSize: 13, fontWeight: '700', color: salesColors.terracotta },
  issueBody: { fontSize: 12, lineHeight: 18, color: salesColors.terracotta },
  primaryMiniBtn: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: salesColors.primary },
  primaryMiniBtnText: { fontSize: 13, fontWeight: '700', color: salesColors.white },
  actionStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  secondaryBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: `${salesColors.primaryContainer}55`, borderWidth: 1, borderColor: salesColors.primaryContainer },
  secondaryBtnText: { fontSize: 13, fontWeight: '700', color: salesColors.primary },
  dangerBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: `${salesColors.tertiaryContainer}55`, borderWidth: 1, borderColor: salesColors.tertiaryContainer },
  dangerBtnText: { fontSize: 13, fontWeight: '700', color: colors.danger },
  sectionTitle: { marginTop: 4, fontSize: 22, fontWeight: '900', color: colors.slate, letterSpacing: -0.6 },
  emptyCard: { backgroundColor: salesColors.surface, borderRadius: 16, borderWidth: 1, borderColor: `${salesColors.outlineVariant}55`, padding: 16, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: salesColors.text },
  emptyBody: { fontSize: 13, lineHeight: 19, color: salesColors.textMuted },
  summaryCard: { backgroundColor: salesColors.surfaceLow, borderRadius: 14, borderWidth: 1, borderColor: salesColors.outlineVariant, padding: 14, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  rowLabel: { fontSize: 13, fontWeight: '600', color: salesColors.textMuted },
  rowValue: { fontSize: 13, fontWeight: '700', color: salesColors.text },
  rowStrong: { fontSize: 16, fontWeight: '800', color: salesColors.primary },
  rowDanger: { color: salesColors.terracotta },
  divider: { height: 1, backgroundColor: `${salesColors.outlineVariant}AA` },
  sectionEyebrow: { marginTop: 2, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: salesColors.textMuted },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 46, backgroundColor: salesColors.surfaceLow, borderRadius: 12, borderWidth: 1, borderColor: salesColors.outlineVariant, paddingHorizontal: 12 },
  inputWrapTall: { alignItems: 'flex-start', paddingVertical: 12 },
  input: { flex: 1, fontSize: 14, color: salesColors.text },
  inputTall: { minHeight: 72 },
  errorHint: { fontSize: 12, fontWeight: '600', color: salesColors.terracotta },
  receiptCard: { backgroundColor: salesColors.surfaceLow, borderRadius: 14, borderWidth: 1, borderColor: salesColors.outlineVariant, padding: 14, gap: 12 },
  receiptText: { fontSize: 13, lineHeight: 19, color: salesColors.textMuted },
  receiptActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  removeBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: `${salesColors.tertiaryContainer}55`, borderWidth: 1, borderColor: salesColors.tertiaryContainer },
  removeBtnText: { fontSize: 13, fontWeight: '700', color: salesColors.terracotta },
  receiptPreview: { width: '100%', height: 180, borderRadius: 12, backgroundColor: salesColors.surfaceHighest },
  helperText: { fontSize: 12, lineHeight: 18, color: salesColors.textMuted },
  errorText: { fontSize: 13, fontWeight: '600', color: salesColors.terracotta },
  submitBtn: { marginTop: 4, backgroundColor: salesColors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: salesColors.white },
});
