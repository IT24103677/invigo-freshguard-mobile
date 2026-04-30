import React, { useMemo, useState } from "react";
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
import { router } from "expo-router";

import { createSale } from "@/src/api/sales";
import { usePosCart } from "@/src/context/pos-cart";
import { colors } from "@/src/theme/colors";
import { theme } from "@/src/theme";
import { CartItem } from "@/components/ui/cart-item";
import { BrandMark } from "@/components/ui/brand-mark";

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
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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

  const handleReturnToPos = () => {
    router.replace("/(tabs)");
  };

  const handleClearBill = () => {
    Alert.alert("Clear Bill", "Do you want to remove all items from this bill?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear Bill",
        style: "destructive",
        onPress: () => {
          clearCart();
          setAmountGiven("");
          setCustomerName("");
          setCustomerEmail("");
          setNotes("");
          setErrorMsg("");
          router.replace("/(tabs)");
        },
      },
    ]);
  };

  const handleRecordSale = async () => {
    if (cart.length === 0) {
      setErrorMsg("Add at least one product before checking out.");
      return;
    }

    const parsedAmount = parseFloat(amountGiven);

    if (amountGiven.trim() && (Number.isNaN(parsedAmount) || parsedAmount < 0)) {
      setErrorMsg("Amount given must be a valid number.");
      return;
    }

    if (amountGiven.trim() && parsedAmount < grandTotal) {
      setErrorMsg("Amount given cannot be less than the grand total.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const sale = await createSale({
        customerName: customerName.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        notes: notes.trim() || undefined,
        amountGiven: amountGiven.trim() ? parsedAmount : undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          discountRateApplied: item.discountRate,
        })),
      });

      Alert.alert(
        "Sale Recorded",
        `${sale.saleGroupId}\nTotal: Rs. ${sale.grandTotal}\nChange: Rs. ${
          sale.changeGiven ?? 0
        }`,
        [
          {
            text: "OK",
            onPress: () => {
              clearCart();
              setAmountGiven("");
              setCustomerName("");
              setCustomerEmail("");
              setNotes("");
              router.replace("/(tabs)");
            },
          },
        ]
      );
    } catch (err: any) {
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
                  onUpdateQuantity={updateQuantity}
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
                    placeholder="Amount given"
                    placeholderTextColor={colors.outline}
                    keyboardType="decimal-pad"
                    value={amountGiven}
                    onChangeText={setAmountGiven}
                  />
                </View>
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

              {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

              <Pressable
                onPress={handleRecordSale}
                disabled={submitting || cart.length === 0}
                style={({ pressed }) => [
                  styles.recordBtn,
                  pressed && { opacity: 0.85 },
                  (submitting || cart.length === 0) && { opacity: 0.7 },
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
