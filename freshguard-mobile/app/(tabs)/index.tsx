import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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

import { getProducts } from "@/src/api/products";
import { createSale } from "@/src/api/sales";
import { colors } from "@/src/theme/colors";
import { theme } from "@/src/theme";
import { Product } from "@/src/types/product";
import { ProductImage } from "@/components/ui/product-image";
import { StatusBadge } from "@/components/ui/status-badge";
import { CartItem, CartLineItem } from "@/components/ui/cart-item";

const FILTER_CHIPS = ["ALL", "DAIRY", "PRODUCE", "BAKERY", "BEVERAGES", "MEAT", "FROZEN", "SNACKS"];

function getProductStatus(product: Product): "critical" | "urgent" | "fresh" | "watchlist" {
  // Simple heuristic based on stock — in a real app, we'd use batch expiry data
  return "fresh";
}

export default function PosScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [amountGiven, setAmountGiven] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const cartSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch {
        setErrorMsg("Failed to load products.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    Animated.spring(cartSlide, {
      toValue: showCart ? 1 : 0,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
  }, [showCart]);

  const filtered = products.filter((p) => {
    const matchSearch =
      search.trim() === "" ||
      p.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      activeFilter === "ALL" ||
      p.category.toUpperCase() === activeFilter;
    return matchSearch && matchFilter && p.isActive;
  });

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product._id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product._id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          productName: product.name,
          category: product.category,
          imageUrl: product.imageUrl,
          unitPrice: product.sellingPrice,
          quantity: 1,
          discountRate: 0,
        },
      ];
    });
    setShowCart(true);
    setErrorMsg("");
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.max(1, i.quantity + delta) }
          : i
      )
    );
  };

  const updateDiscount = (productId: string, rate: number) => {
    setCart((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, discountRate: rate } : i))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const next = prev.filter((i) => i.productId !== productId);
      if (next.length === 0) setShowCart(false);
      return next;
    });
  };

  const cartSubTotal = cart.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const cartDiscount = cart.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice * (i.discountRate / 100),
    0
  );
  const grandTotal = +(cartSubTotal - cartDiscount).toFixed(2);

  const handleCreateSale = async () => {
    if (cart.length === 0) {
      setErrorMsg("Add at least one product to the cart.");
      return;
    }
    const parsedAmount = parseFloat(amountGiven);
    if (amountGiven.trim() && (isNaN(parsedAmount) || parsedAmount < 0)) {
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
        notes: notes.trim() || undefined,
        amountGiven: amountGiven.trim() ? parsedAmount : undefined,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          discountRateApplied: i.discountRate,
        })),
      });
      Alert.alert(
        "Sale Recorded ✓",
        `${sale.saleGroupId}\nTotal: Rs. ${sale.grandTotal}\nChange: Rs. ${sale.changeGiven ?? 0}`,
        [{ text: "OK" }]
      );
      setCart([]);
      setShowCart(false);
      setAmountGiven("");
      setNotes("");
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message ?? err?.message ?? "Failed to record sale.");
    } finally {
      setSubmitting(false);
    }
  };

  const cartTranslateY = cartSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  const totalItems = products.length;
  const criticalCount = 0; // placeholder — real data comes from batch expiry

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.primary} />
            <Text style={styles.appTitle}>Invigo FreshGuard</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>SL</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Search bar ── */}
          <View style={styles.searchWrap}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={colors.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search stock inventory..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* ── Filter chips ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {FILTER_CHIPS.map((chip) => (
              <Pressable
                key={chip}
                onPress={() => setActiveFilter(chip)}
                style={[
                  styles.chip,
                  activeFilter === chip && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    activeFilter === chip && styles.chipLabelActive,
                  ]}
                >
                  {chip}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* ── Summary bento ── */}
          <View style={styles.bento}>
            <View style={[styles.bentoCard, { backgroundColor: colors.primaryContainer }]}>
              <Text style={[styles.bentoLabel, { color: colors.onPrimaryContainer }]}>
                TOTAL ITEMS
              </Text>
              <Text style={[styles.bentoValue, { color: colors.onPrimaryContainer }]}>
                {loading ? "—" : totalItems.toLocaleString()}
              </Text>
            </View>
            <View style={[styles.bentoCard, { backgroundColor: colors.tertiaryContainer }]}>
              <Text style={[styles.bentoLabel, { color: colors.onTertiaryContainer }]}>
                CRITICAL
              </Text>
              <Text style={[styles.bentoValue, { color: colors.onTertiaryContainer }]}>
                {loading ? "—" : criticalCount}
              </Text>
            </View>
          </View>

          {/* ── Product list ── */}
          <Text style={styles.sectionTitle}>Active Inventory</Text>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : filtered.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="package-variant" size={48} color={colors.outline} />
              <Text style={styles.emptyText}>No products found.</Text>
            </View>
          ) : (
            filtered.map((product) => {
              const status = getProductStatus(product);
              const inCart = cart.find((c) => c.productId === product._id);
              const accentColor =
                status === "critical"
                  ? colors.terracotta
                  : status === "urgent"
                  ? colors.onTertiaryContainer
                  : status === "watchlist"
                  ? colors.secondary
                  : colors.primary;

              return (
                <Pressable
                  key={product._id}
                  onPress={() => addToCart(product)}
                  style={({ pressed }) => [
                    styles.productCard,
                    { borderLeftColor: accentColor },
                    pressed && styles.productCardPressed,
                  ]}
                >
                  <ProductImage
                    imageUrl={product.imageUrl}
                    productName={product.name}
                    category={product.category}
                    size={64}
                    borderRadius={12}
                  />
                  <View style={styles.productBody}>
                    <View style={styles.productRow}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <StatusBadge variant={status} />
                    </View>
                    <Text style={styles.productCategory}>
                      Category: {product.category}
                    </Text>
                    <View style={styles.productFooter}>
                      <Text style={styles.productPrice}>
                        Rs. {product.sellingPrice.toFixed(2)}
                      </Text>
                      {inCart ? (
                        <View style={styles.inCartBadge}>
                          <MaterialCommunityIcons
                            name="cart-check"
                            size={14}
                            color={colors.primary}
                          />
                          <Text style={styles.inCartText}>×{inCart.quantity}</Text>
                        </View>
                      ) : (
                        <View style={styles.addHint}>
                          <MaterialCommunityIcons
                            name="plus-circle-outline"
                            size={14}
                            color={colors.textMuted}
                          />
                          <Text style={styles.addHintText}>Add</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}

          {/* spacer for cart panel */}
          {showCart && <View style={{ height: 340 }} />}
        </ScrollView>

        {/* ── Cart panel (slide up) ── */}
        {cart.length > 0 && (
          <Animated.View
            style={[styles.cartPanel, { transform: [{ translateY: cartTranslateY }] }]}
          >
            <View style={styles.cartHeader}>
              <Pressable onPress={() => setShowCart((v) => !v)} style={styles.cartToggle}>
                <MaterialCommunityIcons
                  name={showCart ? "chevron-down" : "chevron-up"}
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.cartTitle}>
                  Cart ({cart.length} {cart.length === 1 ? "item" : "items"})
                </Text>
              </Pressable>
              <Text style={styles.grandTotalLabel}>Rs. {grandTotal.toFixed(2)}</Text>
            </View>

            {showCart && (
              <ScrollView
                style={styles.cartItems}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {cart.map((item) => (
                  <CartItem
                    key={item.productId}
                    item={item}
                    onUpdateQuantity={updateQty}
                    onUpdateDiscount={updateDiscount}
                    onRemove={removeFromCart}
                  />
                ))}

                {/* Payment row */}
                <View style={styles.paymentRow}>
                  <View style={styles.paymentField}>
                    <MaterialCommunityIcons name="cash" size={16} color={colors.primary} />
                    <TextInput
                      style={styles.paymentInput}
                      placeholder="Amount given"
                      placeholderTextColor={colors.outline}
                      keyboardType="decimal-pad"
                      value={amountGiven}
                      onChangeText={setAmountGiven}
                    />
                  </View>
                  <View style={styles.paymentField}>
                    <MaterialCommunityIcons name="note-text-outline" size={16} color={colors.textMuted} />
                    <TextInput
                      style={styles.paymentInput}
                      placeholder="Notes (optional)"
                      placeholderTextColor={colors.outline}
                      value={notes}
                      onChangeText={setNotes}
                    />
                  </View>
                </View>

                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                <Pressable
                  onPress={handleCreateSale}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.createBtn,
                    pressed && { opacity: 0.85 },
                    submitting && { opacity: 0.7 },
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="receipt" size={18} color={colors.white} />
                      <Text style={styles.createBtnText}>
                        Record Sale — Rs. {grandTotal.toFixed(2)}
                      </Text>
                    </>
                  )}
                </Pressable>
              </ScrollView>
            )}
          </Animated.View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
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
  appTitle: { fontSize: 18, fontWeight: "700", color: colors.primary },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12, fontWeight: "800", color: colors.onPrimaryContainer },
  scroll: { padding: 20, gap: 14, paddingBottom: 32 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 14,
    height: 48,
    ...theme.shadows.card,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  chips: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceHighest,
  },
  chipActive: { backgroundColor: colors.primary },
  chipLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  chipLabelActive: { color: colors.white },
  bento: { flexDirection: "row", gap: 14 },
  bentoCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    gap: 4,
    ...theme.shadows.card,
  },
  bentoLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  bentoValue: { fontSize: 26, fontWeight: "700" },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: -4,
  },
  empty: { alignItems: "center", paddingTop: 48, gap: 12 },
  emptyText: { fontSize: 15, color: colors.textMuted },
  productCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    gap: 14,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...theme.shadows.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant + "40",
  },
  productCardPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  productBody: { flex: 1, gap: 4 },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  productName: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.text, marginRight: 6 },
  productCategory: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4, color: colors.outline, textTransform: "uppercase" },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  productPrice: { fontSize: 14, fontWeight: "700", color: colors.primary },
  inCartBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryContainer + "60",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  inCartText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  addHint: { flexDirection: "row", alignItems: "center", gap: 4 },
  addHintText: { fontSize: 12, color: colors.textMuted },
  // Cart panel
  cartPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: colors.outlineVariant,
    maxHeight: 480,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  cartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + "50",
  },
  cartToggle: { flexDirection: "row", alignItems: "center", gap: 8 },
  cartTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  grandTotalLabel: { fontSize: 18, fontWeight: "800", color: colors.primary },
  cartItems: { padding: 16, gap: 10 },
  paymentRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  paymentField: {
    flex: 1,
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
  paymentInput: { flex: 1, fontSize: 14, color: colors.text },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.terracotta,
    marginTop: 4,
  },
  createBtn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 8,
  },
  createBtnText: { fontSize: 16, fontWeight: "700", color: colors.white },
});
