import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import { logoutUser } from "@/src/api/auth";
import { useAuthSession } from "@/src/context/auth-session";
import { usePosCart } from "@/src/context/pos-cart";
import { getProducts } from "@/src/api/products";
import { colors } from "@/src/theme/colors";
import { theme } from "@/src/theme";
import { Product } from "@/src/types/product";
import { ProductImage } from "@/components/ui/product-image";
import { StatusBadge } from "@/components/ui/status-badge";
import { BrandMark } from "@/components/ui/brand-mark";

const FILTER_CHIPS = [
  "ALL",
  "DAIRY",
  "PRODUCE",
  "BAKERY",
  "BEVERAGES",
  "MEAT",
  "FROZEN",
  "SNACKS",
];

function getProductStatus(
  product: Product
): "critical" | "urgent" | "fresh" | "watchlist" {
  const sellableUnits = product.sellableUnits ?? 0;

  if (sellableUnits <= 0) {
    return "critical";
  }

  if (sellableUnits <= 5) {
    return "urgent";
  }

  if (product.nearestExpiryDate) {
    const expiryDate = new Date(product.nearestExpiryDate).getTime();
    const diffDays = (expiryDate - Date.now()) / (1000 * 60 * 60 * 24);

    if (diffDays <= 3) {
      return "watchlist";
    }
  }

  return "fresh";
}

function formatNearestExpiry(dateStr?: string | null) {
  if (!dateStr) {
    return "No active expiry";
  }

  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function PosScreen() {
  const { setIsAuthenticated } = useAuthSession();
  const { cart, addProduct, incrementProduct, decrementProduct } = usePosCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const loadProducts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMsg("");
      const data = await getProducts();
      setProducts(data);
    } catch {
      setErrorMsg("Failed to load products.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useFocusEffect(
    useCallback(() => {
      loadProducts(true);
    }, [loadProducts])
  );

  const filtered = useMemo(
    () =>
      products.filter((product) => {
        const matchSearch =
          search.trim() === "" ||
          product.name.toLowerCase().includes(search.toLowerCase());
        const matchFilter =
          activeFilter === "ALL" ||
          product.category.toUpperCase() === activeFilter;

        return matchSearch && matchFilter && product.isActive;
      }),
    [products, search, activeFilter]
  );

  const totalItems = products.length;
  const criticalCount = products.filter(
    (product) => getProductStatus(product) === "critical"
  ).length;
  const cartSubTotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const cartDiscount = cart.reduce(
    (sum, item) =>
      sum + item.quantity * item.unitPrice * (item.discountRate / 100),
    0
  );
  const grandTotal = +(cartSubTotal - cartDiscount).toFixed(2);
  const totalCartUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleLogout = () => {
    Alert.alert("Log Out", "Do you want to end your current session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            await logoutUser();
            setIsAuthenticated(false);
            router.replace("/login");
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BrandMark size={24} />
          <Text style={styles.appTitle}>Invigo FreshGuard</Text>
        </View>
        <Pressable
          onPress={handleLogout}
          disabled={isLoggingOut}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
            isLoggingOut && styles.logoutButtonDisabled,
          ]}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color={colors.terracotta} />
          ) : (
            <>
              <MaterialCommunityIcons
                name="logout-variant"
                size={16}
                color={colors.terracotta}
              />
              <Text style={styles.logoutText}>Log Out</Text>
            </>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadProducts(true)}
            tintColor={colors.primary}
          />
        }
      >
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {FILTER_CHIPS.map((chip) => (
            <Pressable
              key={chip}
              onPress={() => setActiveFilter(chip)}
              style={[styles.chip, activeFilter === chip && styles.chipActive]}
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

        <View style={styles.bento}>
          <View
            style={[
              styles.bentoCard,
              { backgroundColor: colors.primaryContainer },
            ]}
          >
            <Text
              style={[styles.bentoLabel, { color: colors.onPrimaryContainer }]}
            >
              TOTAL ITEMS
            </Text>
            <Text
              style={[styles.bentoValue, { color: colors.onPrimaryContainer }]}
            >
              {loading ? "-" : totalItems.toLocaleString()}
            </Text>
          </View>

          <View
            style={[
              styles.bentoCard,
              { backgroundColor: colors.tertiaryContainer },
            ]}
          >
            <Text
              style={[
                styles.bentoLabel,
                { color: colors.onTertiaryContainer },
              ]}
            >
              CRITICAL
            </Text>
            <Text
              style={[
                styles.bentoValue,
                { color: colors.onTertiaryContainer },
              ]}
            >
              {loading ? "-" : criticalCount}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Active Inventory</Text>

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons
              name="package-variant"
              size={48}
              color={colors.outline}
            />
            <Text style={styles.emptyText}>No products found.</Text>
          </View>
        ) : (
          filtered.map((product) => {
            const status = getProductStatus(product);
            const inCart = cart.find((item) => item.productId === product._id);
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
                onPress={() => addProduct(product)}
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
                  <View style={styles.inventoryMetaRow}>
                    <Text style={styles.inventoryMetaText}>
                      {(product.sellableUnits ?? 0).toLocaleString()} units sellable
                    </Text>
                    <Text style={styles.inventoryMetaDivider}>|</Text>
                    <Text style={styles.inventoryMetaText}>
                      {product.activeBatchCount ?? 0}{" "}
                      {(product.activeBatchCount ?? 0) === 1 ? "batch" : "batches"}
                    </Text>
                  </View>
                  <Text style={styles.inventoryMetaSubtle}>
                    Nearest expiry: {formatNearestExpiry(product.nearestExpiryDate)}
                  </Text>

                  <View style={styles.productFooter}>
                    <Text style={styles.productPrice}>
                      Rs. {product.sellingPrice.toFixed(2)}
                    </Text>

                    {inCart ? (
                      <View style={styles.productControlWrap}>
                        <Text style={styles.inBillText}>In bill</Text>
                        <View style={styles.qtyStepper}>
                          <Pressable
                            onPress={() => decrementProduct(product._id)}
                            hitSlop={8}
                            style={styles.qtyStepperBtn}
                          >
                            <MaterialCommunityIcons
                              name="minus"
                              size={14}
                              color={colors.primary}
                            />
                          </Pressable>
                          <Text style={styles.qtyStepperValue}>
                            {inCart.quantity}
                          </Text>
                          <Pressable
                            onPress={() => incrementProduct(product)}
                            hitSlop={8}
                            style={styles.qtyStepperBtn}
                          >
                            <MaterialCommunityIcons
                              name="plus"
                              size={14}
                              color={colors.primary}
                            />
                          </Pressable>
                        </View>
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

        <View style={{ height: cart.length > 0 ? 110 : 24 }} />
      </ScrollView>

      {cart.length > 0 && (
        <Pressable
          onPress={() => router.push("/checkout")}
          style={({ pressed }) => [
            styles.checkoutBar,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          <View style={styles.checkoutLeft}>
            <MaterialCommunityIcons
              name="cart-outline"
              size={18}
              color={colors.white}
            />
            <Text style={styles.checkoutText}>
              Checkout ({totalCartUnits} {totalCartUnits === 1 ? "unit" : "units"})
            </Text>
          </View>
          <Text style={styles.checkoutTotal}>Rs. {grandTotal.toFixed(2)}</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  appTitle: { fontSize: 18, fontWeight: "700", color: colors.primary },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.terracottaSoft + "80",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.terracottaSoft,
  },
  logoutButtonPressed: { opacity: 0.85 },
  logoutButtonDisabled: { opacity: 0.7 },
  logoutText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.terracotta,
  },
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
  bentoLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  bentoValue: { fontSize: 26, fontWeight: "700" },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: -4,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.terracotta,
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
  productName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginRight: 6,
  },
  productCategory: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: colors.outline,
    textTransform: "uppercase",
  },
  inventoryMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  inventoryMetaText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  inventoryMetaDivider: {
    fontSize: 11,
    color: colors.outline,
  },
  inventoryMetaSubtle: {
    fontSize: 11,
    color: colors.textMuted,
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  productPrice: { fontSize: 14, fontWeight: "700", color: colors.primary },
  productControlWrap: {
    alignItems: "flex-end",
    gap: 4,
  },
  inBillText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.primary,
  },
  qtyStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.primaryContainer + "60",
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  qtyStepperBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  qtyStepperValue: {
    minWidth: 22,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
  },
  addHint: { flexDirection: "row", alignItems: "center", gap: 4 },
  addHintText: { fontSize: 12, color: colors.textMuted },
  checkoutBar: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...theme.shadows.card,
  },
  checkoutLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  checkoutText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
  checkoutTotal: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.white,
  },
});
