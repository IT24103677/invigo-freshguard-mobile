import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";

import { getProducts } from "@/src/api/products";
import { createSale, uploadSaleReceipt } from "@/src/api/sales";
import { usePosCart } from "@/src/context/pos-cart";
import { colors } from "@/src/theme/colors";
import { theme } from "@/src/theme";
import { CartItem } from "@/components/ui/cart-item";
import { BrandMark } from "@/components/ui/brand-mark";
import { Product } from "@/src/types/product";

function generateClientRequestKey() {
  return `sale-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type CartStockIssue = {
  productId: string;
  productName: string;
  allowedQuantity: number;
  currentQuantity: number;
  reason: string;
};

function getCartStockIssues(
  cart: ReturnType<typeof usePosCart>["cart"],
  productsMap: Record<string, Product>
) {
  return cart.reduce<CartStockIssue[]>((issues, item) => {
    const latestProduct = productsMap[item.productId];

    if (!latestProduct || !latestProduct.isActive) {
      issues.push({
        productId: item.productId,
        productName: item.productName,
        allowedQuantity: 0,
        currentQuantity: item.quantity,
        reason: "This product is no longer available for sale.",
      });
      return issues;
    }

    const allowedQuantity = Math.max(0, latestProduct.sellableUnits ?? 0);

    if (allowedQuantity <= 0) {
      issues.push({
        productId: item.productId,
        productName: item.productName,
        allowedQuantity,
        currentQuantity: item.quantity,
        reason: "This product is now out of stock.",
      });
      return issues;
    }

    if (item.quantity > allowedQuantity) {
      issues.push({
        productId: item.productId,
        productName: item.productName,
        allowedQuantity,
        currentQuantity: item.quantity,
        reason: `Only ${allowedQuantity} ${
          allowedQuantity === 1 ? "unit is" : "units are"
        } currently sellable.`,
      });
    }

    return issues;
  }, []);
}

export default function CheckoutScreen() {
  const {
    cart,
    updateQuantity,
    updateDiscount,
    removeProduct,
    clearCart,
  } = usePosCart();
  const [amountGiven, setAmountGiven] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptAsset, setReceiptAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stockRefreshing, setStockRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [clientRequestKey, setClientRequestKey] = useState(() =>
    generateClientRequestKey()
  );
  const [hasStockSnapshot, setHasStockSnapshot] = useState(false);
  const [latestProducts, setLatestProducts] = useState<Record<string, Product>>({});

  const cartSubTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [cart]
  );
  const cartDiscount = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum + item.quantity * item.unitPrice * (item.discountRate / 100),
        0
      ),
    [cart]
  );
  const grandTotal = +(cartSubTotal - cartDiscount).toFixed(2);
  const totalCartUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  const parsedAmountGiven = amountGiven.trim() ? parseFloat(amountGiven) : null;
  const previewChange =
    parsedAmountGiven != null && !Number.isNaN(parsedAmountGiven)
      ? +(parsedAmountGiven - grandTotal).toFixed(2)
      : null;
  const isAmountMissing = amountGiven.trim().length === 0;
  const isAmountInvalid =
    !isAmountMissing &&
    (Number.isNaN(parsedAmountGiven ?? Number.NaN) || (parsedAmountGiven ?? 0) < 0);
  const isAmountInsufficient =
    !isAmountMissing &&
    !isAmountInvalid &&
    (parsedAmountGiven ?? 0) < grandTotal;
  const cartStockIssues = useMemo(
    () => (hasStockSnapshot ? getCartStockIssues(cart, latestProducts) : []),
    [cart, hasStockSnapshot, latestProducts]
  );
  const canSubmitSale =
    cart.length > 0 &&
    !submitting &&
    !stockRefreshing &&
    hasStockSnapshot &&
    cartStockIssues.length === 0 &&
    !isAmountMissing &&
    !isAmountInvalid &&
    !isAmountInsufficient;

  const refreshLatestStock = useCallback(async () => {
    setStockRefreshing(true);

    try {
      const products = await getProducts();
      const productsMap = products.reduce<Record<string, Product>>(
        (map, product) => {
          map[product._id] = product;
          return map;
        },
        {}
      );
      setLatestProducts(productsMap);
      setHasStockSnapshot(true);
      return productsMap;
    } catch {
      setErrorMsg(
        "We could not refresh live stock just now. Please try again before recording the sale."
      );
      return null;
    } finally {
      setStockRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshLatestStock();
    }, [refreshLatestStock])
  );

  const resetCheckoutState = () => {
    clearCart();
    setAmountGiven("");
    setCustomerName("");
    setCustomerEmail("");
    setNotes("");
    setReceiptAsset(null);
    setClientRequestKey(generateClientRequestKey());
    setErrorMsg("");
  };

  const handleReturnToPos = () => {
    router.replace("/(tabs)");
  };

  const handleCheckoutQuantityChange = (productId: string, delta: number) => {
    if (delta <= 0) {
      updateQuantity(productId, delta);
      return;
    }

    const currentItem = cart.find((item) => item.productId === productId);
    const latestProduct = latestProducts[productId];
    const allowedQuantity = Math.max(0, latestProduct?.sellableUnits ?? Number.MAX_SAFE_INTEGER);

    if (currentItem && currentItem.quantity >= allowedQuantity) {
      const productName = latestProduct?.name ?? currentItem.productName;
      setErrorMsg(
        `${productName} already matches the latest sellable stock limit.`
      );
      return;
    }

    updateQuantity(productId, delta);
  };

  const handleAutoAdjustBill = () => {
    cartStockIssues.forEach((issue) => {
      if (issue.allowedQuantity <= 0) {
        removeProduct(issue.productId);
        return;
      }

      const reduction = issue.currentQuantity - issue.allowedQuantity;

      if (reduction > 0) {
        updateQuantity(issue.productId, -reduction);
      }
    });

    setErrorMsg("");
  };

  const handleClearBill = () => {
    Alert.alert("Clear Bill", "Do you want to remove all items from this bill?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear Bill",
        style: "destructive",
        onPress: () => {
          resetCheckoutState();
          router.replace("/(tabs)");
        },
      },
    ]);
  };

  const handleAttachReceipt = () => {
    Alert.alert("Attach Receipt", "Choose how you want to add the receipt image.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Camera",
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();

          if (!permission.granted) {
            setErrorMsg("Camera permission is required to capture a receipt.");
            return;
          }

          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            quality: 0.7,
          });

          if (!result.canceled) {
            setReceiptAsset(result.assets[0]);
          }
        },
      },
      {
        text: "Gallery",
        onPress: async () => {
          const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

          if (!permission.granted) {
            setErrorMsg(
              "Media library permission is required to attach a receipt."
            );
            return;
          }

          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            quality: 0.7,
          });

          if (!result.canceled) {
            setReceiptAsset(result.assets[0]);
          }
        },
      },
    ]);
  };

  const handleRecordSale = async () => {
    if (cart.length === 0) {
      setErrorMsg("Add at least one product before checking out.");
      return;
    }

    if (!amountGiven.trim()) {
      setErrorMsg("Amount given is required before recording the sale.");
      return;
    }

    const parsedAmount = parseFloat(amountGiven);

    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      setErrorMsg("Amount given must be a valid number.");
      return;
    }

    if (parsedAmount < grandTotal) {
      setErrorMsg("Amount given cannot be less than the grand total.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");
      const latestProductsMap = await refreshLatestStock();

      if (!latestProductsMap) {
        return;
      }

      const latestIssues = getCartStockIssues(cart, latestProductsMap);

      if (latestIssues.length > 0) {
        setErrorMsg(
          `${latestIssues[0].productName} changed stock while this bill was open. Review the bill and try again.`
        );
        return;
      }

      const sale = await createSale({
        clientRequestKey,
        customerName: customerName.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        notes: notes.trim() || undefined,
        amountGiven: parsedAmount,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          discountRateApplied: item.discountRate,
        })),
      });

      let receiptUploadFailed = false;

      if (receiptAsset) {
        try {
          await uploadSaleReceipt(sale._id, receiptAsset);
        } catch {
          receiptUploadFailed = true;
        }
      }

      Alert.alert(
        receiptUploadFailed ? "Sale Recorded (Receipt Pending)" : "Sale Recorded",
        `${sale.saleGroupId}\nTotal: Rs. ${sale.grandTotal}\nChange: Rs. ${
          sale.changeGiven ?? 0
        }${
          receiptUploadFailed
            ? "\nReceipt upload failed. You can retry later from the sale details flow."
            : ""
        }`,
        [
          {
            text: "View Details",
            onPress: () => {
              resetCheckoutState();
              router.replace(`/sales/${sale._id}`);
            },
          },
          {
            text: "OK",
            onPress: () => {
              resetCheckoutState();
              router.replace("/(tabs)");
            },
          },
        ]
      );
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setErrorMsg(
          err?.response?.data?.message ??
            "Possible duplicate sale detected. Check Sales before retrying."
        );
        return;
      }

      setErrorMsg(
        err?.response?.data?.message ?? err?.message ?? "Failed to record sale."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <MaterialCommunityIcons
                name="arrow-left"
                size={18}
                color={colors.primary}
              />
            </Pressable>
            <BrandMark size={22} />
            <Text style={styles.headerTitle}>Checkout</Text>
          </View>
          <Pressable onPress={handleClearBill} style={styles.clearBtn}>
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={16}
              color={colors.terracotta}
            />
            <Text style={styles.clearBtnText}>Clear</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Ready to Complete</Text>
            <Text style={styles.heroTitle}>
              {totalCartUnits} {totalCartUnits === 1 ? "unit" : "units"} in bill
            </Text>
            <Text style={styles.heroAmount}>Rs. {grandTotal.toFixed(2)}</Text>
          </View>

          {cart.length > 0 ? (
            <View style={styles.liveStockCard}>
              <View style={styles.liveStockHeader}>
                <View style={styles.liveStockTitleWrap}>
                  <MaterialCommunityIcons
                    name="database-refresh-outline"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.liveStockTitle}>Live Stock Check</Text>
                </View>
                <Pressable
                  onPress={refreshLatestStock}
                  disabled={stockRefreshing}
                  style={({ pressed }) => [
                    styles.liveStockRefreshBtn,
                    pressed && { opacity: 0.85 },
                    stockRefreshing && { opacity: 0.7 },
                  ]}
                >
                  {stockRefreshing ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name="refresh"
                        size={14}
                        color={colors.primary}
                      />
                      <Text style={styles.liveStockRefreshText}>Refresh</Text>
                    </>
                  )}
                </Pressable>
              </View>
              <Text style={styles.liveStockBodyText}>
                {!hasStockSnapshot
                  ? "Checking the latest sellable stock before this bill can be completed."
                  : cartStockIssues.length === 0
                  ? "This bill matches the latest sellable stock."
                  : "Some items changed while this bill was open. Adjust them before recording the sale."}
              </Text>
              {hasStockSnapshot && cartStockIssues.length > 0 ? (
                <View style={styles.stockIssueList}>
                  {cartStockIssues.map((issue) => (
                    <View key={issue.productId} style={styles.stockIssueItem}>
                      <Text style={styles.stockIssueName}>{issue.productName}</Text>
                      <Text style={styles.stockIssueDetail}>
                        {issue.reason} In bill: {issue.currentQuantity}. Allowed now:{" "}
                        {issue.allowedQuantity}.
                      </Text>
                    </View>
                  ))}
                  <Pressable
                    onPress={handleAutoAdjustBill}
                    style={styles.autoAdjustBtn}
                  >
                    <MaterialCommunityIcons
                      name="auto-fix"
                      size={16}
                      color={colors.white}
                    />
                    <Text style={styles.autoAdjustBtnText}>Auto Adjust Bill</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}

          <Pressable onPress={handleReturnToPos} style={styles.addMoreBtn}>
            <MaterialCommunityIcons
              name="playlist-plus"
              size={18}
              color={colors.primary}
            />
            <Text style={styles.addMoreBtnText}>Add More Items</Text>
          </Pressable>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bill Items</Text>
            {cart.length === 0 ? (
              <View style={styles.emptyWrap}>
                <MaterialCommunityIcons
                  name="cart-outline"
                  size={44}
                  color={colors.outline}
                />
                <Text style={styles.emptyText}>Your bill is empty.</Text>
                <Pressable onPress={handleReturnToPos} style={styles.emptyActionBtn}>
                  <MaterialCommunityIcons
                    name="arrow-left"
                    size={16}
                    color={colors.white}
                  />
                  <Text style={styles.emptyActionText}>Back to POS</Text>
                </Pressable>
              </View>
            ) : (
              cart.map((item) => (
                <CartItem
                  key={item.productId}
                  item={item}
                  onUpdateQuantity={handleCheckoutQuantityChange}
                  onUpdateDiscount={updateDiscount}
                  onRemove={removeProduct}
                />
              ))
            )}
          </View>

          {cart.length > 0 && (
            <>
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>
                    Rs. {cartSubTotal.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={styles.summaryValue}>
                    -Rs. {cartDiscount.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryGrandLabel}>Grand Total</Text>
                  <Text style={styles.summaryGrandValue}>
                    Rs. {grandTotal.toFixed(2)}
                  </Text>
                </View>
                {previewChange != null && !Number.isNaN(previewChange) ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Change Preview</Text>
                    <Text
                      style={[
                        styles.summaryValue,
                        previewChange < 0 && styles.summaryValueError,
                      ]}
                    >
                      Rs. {previewChange.toFixed(2)}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.checkoutSectionTitle}>Customer Details</Text>
              <View style={styles.checkoutStack}>
                <View style={styles.field}>
                  <MaterialCommunityIcons
                    name="account-outline"
                    size={16}
                    color={colors.primary}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Customer name (optional)"
                    placeholderTextColor={colors.outline}
                    value={customerName}
                    onChangeText={setCustomerName}
                  />
                </View>
                <View style={styles.field}>
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={16}
                    color={colors.primary}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Customer email (optional)"
                    placeholderTextColor={colors.outline}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={customerEmail}
                    onChangeText={setCustomerEmail}
                  />
                </View>
              </View>

              <Text style={styles.checkoutSectionTitle}>Payment and Notes</Text>
              <View style={styles.checkoutStack}>
                <View style={styles.field}>
                  <MaterialCommunityIcons
                    name="cash"
                    size={16}
                    color={colors.primary}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Amount given *"
                    placeholderTextColor={colors.outline}
                    keyboardType="decimal-pad"
                    value={amountGiven}
                    onChangeText={setAmountGiven}
                  />
                </View>
                <Text
                  style={[
                    styles.fieldHintText,
                    (isAmountInvalid || isAmountInsufficient) &&
                      styles.fieldHintErrorText,
                  ]}
                >
                  {isAmountMissing
                    ? hasStockSnapshot
                      ? "Enter the cash amount received to enable checkout."
                      : "Waiting for a live stock check before checkout can continue."
                    : cartStockIssues.length > 0
                    ? "Resolve the stock changes above before recording this sale."
                    : isAmountInvalid
                    ? "Amount given must be a valid non-negative number."
                    : isAmountInsufficient
                    ? "Amount given must cover the grand total."
                    : `Payment looks valid. Change to return: Rs. ${(previewChange ?? 0).toFixed(2)}`}
                </Text>
                <View style={styles.field}>
                  <MaterialCommunityIcons
                    name="note-text-outline"
                    size={16}
                    color={colors.textMuted}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Notes (optional)"
                    placeholderTextColor={colors.outline}
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>
              </View>

              <Text style={styles.checkoutSectionTitle}>Receipt Attachment</Text>
              <View style={styles.receiptCard}>
                <Text style={styles.receiptText}>
                  Optionally attach a receipt photo from the camera or gallery.
                </Text>
                <View style={styles.receiptActions}>
                  <Pressable
                    onPress={handleAttachReceipt}
                    style={styles.attachReceiptBtn}
                  >
                    <MaterialCommunityIcons
                      name="receipt-text-plus-outline"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.attachReceiptBtnText}>
                      {receiptAsset ? "Replace Receipt" : "Attach Receipt"}
                    </Text>
                  </Pressable>
                  {receiptAsset ? (
                    <Pressable
                      onPress={() => setReceiptAsset(null)}
                      style={styles.removeReceiptBtn}
                    >
                      <Text style={styles.removeReceiptBtnText}>Remove</Text>
                    </Pressable>
                  ) : null}
                </View>

                {receiptAsset ? (
                  <View style={styles.receiptPreviewWrap}>
                    <Image
                      source={{ uri: receiptAsset.uri }}
                      style={styles.receiptPreview}
                      contentFit="cover"
                    />
                    <Text style={styles.receiptPreviewLabel}>
                      Receipt ready to upload
                    </Text>
                  </View>
                ) : null}
              </View>

              {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

              <Pressable
                onPress={handleRecordSale}
                disabled={!canSubmitSale}
                style={({ pressed }) => [
                  styles.recordBtn,
                  pressed && { opacity: 0.85 },
                  !canSubmitSale && { opacity: 0.7 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="receipt"
                      size={18}
                      color={colors.white}
                    />
                    <Text style={styles.recordBtnText}>
                      Record Sale - Rs. {grandTotal.toFixed(2)}
                    </Text>
                  </>
                )}
              </Pressable>
            </>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface + "cc",
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + "40",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surfaceLow,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.primary },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.terracottaSoft + "55",
    borderWidth: 1,
    borderColor: colors.terracottaSoft,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.terracotta,
  },
  scroll: { padding: 20, gap: 14, paddingBottom: 32 },
  heroCard: {
    backgroundColor: colors.primaryFixed,
    borderRadius: 18,
    padding: 18,
    gap: 4,
    ...theme.shadows.card,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.primary,
  },
  heroTitle: { fontSize: 22, fontWeight: "800", color: colors.text },
  heroAmount: { fontSize: 26, fontWeight: "800", color: colors.primary },
  liveStockCard: {
    backgroundColor: colors.surfaceLow,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 14,
    gap: 10,
  },
  liveStockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  liveStockTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveStockTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  liveStockRefreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.primaryContainer + "55",
    borderWidth: 1,
    borderColor: colors.primaryContainer,
  },
  liveStockRefreshText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  liveStockBodyText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  stockIssueList: {
    gap: 10,
  },
  stockIssueItem: {
    backgroundColor: colors.terracottaSoft + "45",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.terracottaSoft,
    padding: 12,
    gap: 4,
  },
  stockIssueName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.terracotta,
  },
  stockIssueDetail: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.terracotta,
  },
  autoAdjustBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  autoAdjustBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
  addMoreBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primaryContainer + "55",
    borderWidth: 1,
    borderColor: colors.primaryContainer,
  },
  addMoreBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  section: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 28,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant + "50",
  },
  emptyText: { fontSize: 14, color: colors.textMuted },
  emptyActionBtn: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  emptyActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
  summaryCard: {
    backgroundColor: colors.surfaceLow,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 14,
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  summaryValueError: { color: colors.terracotta },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant + "70",
    marginVertical: 2,
  },
  summaryGrandLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  summaryGrandValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.primary,
  },
  checkoutSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginTop: 6,
  },
  checkoutStack: { gap: 12 },
  receiptCard: {
    backgroundColor: colors.surfaceLow,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 14,
    gap: 12,
  },
  receiptText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  receiptActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  attachReceiptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primaryContainer + "55",
    borderWidth: 1,
    borderColor: colors.primaryContainer,
  },
  attachReceiptBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  removeReceiptBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.terracottaSoft + "55",
    borderWidth: 1,
    borderColor: colors.terracottaSoft,
  },
  removeReceiptBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.terracotta,
  },
  receiptPreviewWrap: {
    gap: 8,
  },
  receiptPreview: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: colors.surfaceHigh,
  },
  receiptPreviewLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceLow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 12,
    height: 44,
  },
  input: { flex: 1, fontSize: 14, color: colors.text },
  fieldHintText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: -2,
  },
  fieldHintErrorText: {
    color: colors.terracotta,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.terracotta,
    marginTop: 4,
  },
  recordBtn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  recordBtnText: { fontSize: 16, fontWeight: "700", color: colors.white },
});
