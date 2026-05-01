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

const STOCK_FILTER_CHIPS = [
  "ALL_STOCK",
  "IN_STOCK",
  "LOW_STOCK",
  "UNAVAILABLE",
] as const;
type StockFilter = (typeof STOCK_FILTER_CHIPS)[number];

type CartStockIssue = {
  productId: string;
  productName: string;
  allowedQuantity: number;
  currentQuantity: number;
  reason: string;
};

function getStockStatus(product: Product): "critical" | "low-stock" | "in-stock" {
  const sellableUnits = product.sellableUnits ?? 0;

  if (sellableUnits <= 0) {
    return "critical";
  }

  if (sellableUnits <= 5) {
    return "low-stock";
  }

  return "in-stock";
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

function getExpiryStatus(
  product: Product
): {
  variant: "expired" | "expires-soon" | "stable";
  label: string;
} {
  if (!product.nearestExpiryDate || (product.activeBatchCount ?? 0) <= 0) {
    return { variant: "stable", label: "No Active Batch" };
  }

  const expiryDate = new Date(product.nearestExpiryDate);
  const diffDays = Math.floor(
    (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return { variant: "expired", label: "Expired" };
  }

  if (diffDays === 0) {
    return { variant: "expires-soon", label: "Expires Today" };
  }

  if (diffDays <= 3) {
    return { variant: "expires-soon", label: `Expires in ${diffDays}d` };
  }

  return { variant: "stable", label: `Stable ${formatNearestExpiry(product.nearestExpiryDate)}` };
}

function matchesProductSearch(product: Product, rawSearch: string) {
  const query = rawSearch.trim().toLowerCase();

  if (!query) {
    return true;
  }

  const searchableFields = [
    product.name,
    product.category,
    product.sku,
    product.barcode,
    product.brand,
    product.supplier,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return searchableFields.some((field) => field.includes(query));
}

function normalizeCategoryKey(category?: string | null) {
  return (category ?? "").trim().toUpperCase();
}

function formatCategoryLabel(category: string) {
  return category
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

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

export default function PosScreen() {
  const { setIsAuthenticated } = useAuthSession();
  const {
    cart,
    addProduct,
    incrementProduct,
    decrementProduct,
    updateQuantity,
    removeProduct,
    clearCart,
  } = usePosCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [stockFilter, setStockFilter] = useState<StockFilter>("ALL_STOCK");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const hasActiveSearch = search.trim().length > 0;

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
        setErrorMsg("Could not load products.");
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

  const categoryChips = useMemo(() => {
    const categories = Array.from(
      new Set(
        products
          .map((product) => product.category)
          .filter(Boolean)
          .map((category) => normalizeCategoryKey(category))
          .filter((category) => category.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b));

    return ["ALL", ...categories];
  }, [products]);

  useEffect(() => {
    if (activeFilter !== "ALL" && !categoryChips.includes(activeFilter)) {
      setActiveFilter("ALL");
    }
  }, [activeFilter, categoryChips]);

  const filtered = useMemo(
    () =>
      products.filter((product) => {
        const matchSearch = matchesProductSearch(product, search);
        const matchFilter =
          activeFilter === "ALL" ||
          normalizeCategoryKey(product.category) === activeFilter;
        const stockStatus = getStockStatus(product);
        const matchStockFilter =
          stockFilter === "ALL_STOCK" ||
          (stockFilter === "IN_STOCK" && stockStatus === "in-stock") ||
          (stockFilter === "LOW_STOCK" && stockStatus === "low-stock") ||
          (stockFilter === "UNAVAILABLE" && stockStatus === "critical");

        return matchSearch && matchFilter && matchStockFilter && product.isActive;
      }),
    [products, search, activeFilter, stockFilter]
  );

  const totalItems = products.length;
  const criticalCount = products.filter(
    (product) => getStockStatus(product) === "critical"
  ).length;
  const filteredCount = filtered.length;
  const productsMap = useMemo(
    () =>
      products.reduce<Record<string, Product>>((map, product) => {
        map[product._id] = product;
        return map;
      }, {}),
    [products]
  );
  const canValidateCartStock = !loading && Object.keys(productsMap).length > 0;
  const cartStockIssues = useMemo(
    () => (canValidateCartStock ? getCartStockIssues(cart, productsMap) : []),
    [canValidateCartStock, cart, productsMap]
  );
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
  const selectedCategoryLabel =
    activeFilter === "ALL" ? "All Categories" : formatCategoryLabel(activeFilter);
  const selectedStockFilterLabel =
    stockFilter === "ALL_STOCK"
      ? "All Stock"
      : stockFilter === "IN_STOCK"
      ? "In Stock"
      : stockFilter === "LOW_STOCK"
      ? "Low Stock"
      : "Unavailable";

  const handleLogout = () => {
    Alert.alert("Log Out", "Do you want to sign out of this session?", [
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

  const handleClearCurrentBill = () => {
    Alert.alert(
      "Clear Current Bill",
      "Do you want to remove all currently selected products before checkout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Bill",
          style: "destructive",
          onPress: () => clearCart(),
        },
      ]
    );
  };

  const handleAutoAdjustCurrentBill = () => {
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
            placeholder="Search by name, SKU, or barcode..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {hasActiveSearch ? (
            <Pressable
              onPress={() => setSearch("")}
              hitSlop={8}
              style={styles.clearSearchButton}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.searchMetaRow}>
          <Text style={styles.searchHelperText}>
            Search by product name, SKU, barcode, brand, or supplier
          </Text>
          {!loading ? (
            <Text style={styles.searchCountText}>
              {filteredCount} {filteredCount === 1 ? "result" : "results"}
            </Text>
          ) : null}
        </View>
        {(activeFilter !== "ALL" || stockFilter !== "ALL_STOCK") && (
          <Text style={styles.searchContextText}>
            Showing {selectedCategoryLabel} · {selectedStockFilterLabel}
          </Text>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {categoryChips.map((chip) => (
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
                {chip === "ALL" ? "All" : formatCategoryLabel(chip)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stockChips}
        >
          {STOCK_FILTER_CHIPS.map((chip) => {
            const isSelected = stockFilter === chip;
            const label =
              chip === "ALL_STOCK"
                ? "All Stock"
                : chip === "IN_STOCK"
                ? "In Stock"
                : chip === "LOW_STOCK"
                ? "Low Stock"
                : "Unavailable";

            return (
              <Pressable
                key={chip}
                onPress={() => setStockFilter(chip)}
                style={[
                  styles.stockChip,
                  isSelected && styles.stockChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.stockChipLabel,
                    isSelected && styles.stockChipLabelActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.stockLegendText}>
          Low Stock means 5 or fewer sellable units. Unavailable means 0 sellable
          units.
        </Text>

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

        {errorMsg ? (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{errorMsg}</Text>
            <Pressable onPress={() => loadProducts()} style={styles.retryInlineBtn}>
              <Text style={styles.retryInlineBtnText}>Try Again</Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons
              name="package-variant-closed-remove"
              size={48}
              color={colors.outline}
            />
            <Text style={styles.emptyText}>No products matched this view.</Text>
            <Text style={styles.emptySubtext}>
              Try another search or clear the current category and stock filters.
            </Text>
            <View style={styles.emptyActions}>
              {hasActiveSearch ? (
                <Pressable
                  onPress={() => setSearch("")}
                  style={styles.emptyActionButton}
                >
                  <Text style={styles.emptyActionLabel}>Clear Search</Text>
                </Pressable>
              ) : null}
              {activeFilter !== "ALL" ? (
                <Pressable
                  onPress={() => setActiveFilter("ALL")}
                  style={styles.emptyActionButton}
                >
                  <Text style={styles.emptyActionLabel}>Show All Categories</Text>
                </Pressable>
              ) : null}
              {stockFilter !== "ALL_STOCK" ? (
                <Pressable
                  onPress={() => setStockFilter("ALL_STOCK")}
                  style={styles.emptyActionButton}
                >
                  <Text style={styles.emptyActionLabel}>Show All Stock</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : (
          filtered.map((product) => {
            const stockStatus = getStockStatus(product);
            const expiryStatus = getExpiryStatus(product);
            const inCart = cart.find((item) => item.productId === product._id);
            const sellableUnits = product.sellableUnits ?? 0;
            const isUnavailable = sellableUnits <= 0;
            const maxInCartReached =
              !!inCart && inCart.quantity >= sellableUnits && sellableUnits > 0;
            const cartIssue = cartStockIssues.find(
              (issue) => issue.productId === product._id
            );
            const accentColor =
              cartIssue
                ? colors.terracotta
                : stockStatus === "critical"
                ? colors.terracotta
                : stockStatus === "low-stock"
                ? colors.secondary
                : colors.primary;

            return (
              <Pressable
                key={product._id}
                onPress={() => {
                  if (!isUnavailable) {
                    addProduct(product);
                  }
                }}
                disabled={isUnavailable}
                style={({ pressed }) => [
                  styles.productCard,
                  { borderLeftColor: accentColor },
                  isUnavailable && styles.productCardDisabled,
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
                      <StatusBadge variant={stockStatus} />
                    </View>

                    <Text style={styles.productCategory}>
                      Category: {product.category}
                    </Text>
                    <View style={styles.productMetaTags}>
                      {product.sku ? (
                        <View style={styles.productMetaTag}>
                          <MaterialCommunityIcons
                            name="tag-outline"
                            size={12}
                            color={colors.primary}
                          />
                          <Text style={styles.productMetaTagText}>
                            SKU {product.sku}
                          </Text>
                        </View>
                      ) : null}
                      {product.barcode ? (
                        <View style={styles.productMetaTag}>
                          <MaterialCommunityIcons
                            name="barcode"
                            size={12}
                            color={colors.primary}
                          />
                          <Text style={styles.productMetaTagText}>
                            Barcode {product.barcode}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.inventoryMetaRow}>
                      <Text style={styles.inventoryMetaText}>
                        {sellableUnits.toLocaleString()} units sellable
                      </Text>
                      <Text style={styles.inventoryMetaDivider}>|</Text>
                      <Text style={styles.inventoryMetaText}>
                        {product.activeBatchCount ?? 0}{" "}
                        {(product.activeBatchCount ?? 0) === 1 ? "batch" : "batches"}
                      </Text>
                    </View>
                    <View style={styles.inventoryStatusRow}>
                      <StatusBadge
                        variant={expiryStatus.variant}
                        label={expiryStatus.label}
                      />
                      <Text style={styles.inventoryMetaSubtle}>
                        Nearest expiry: {formatNearestExpiry(product.nearestExpiryDate)}
                      </Text>
                    </View>

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
                              disabled={maxInCartReached}
                              hitSlop={8}
                              style={[
                                styles.qtyStepperBtn,
                                maxInCartReached && styles.qtyStepperBtnDisabled,
                              ]}
                            >
                              <MaterialCommunityIcons
                                name="plus"
                                size={14}
                                color={
                                  maxInCartReached
                                    ? colors.outline
                                    : colors.primary
                                }
                              />
                            </Pressable>
                          </View>
                          {maxInCartReached ? (
                            <Text style={styles.stockLimitText}>
                              Max sellable quantity reached
                            </Text>
                          ) : cartIssue ? (
                            <Text style={styles.stockConflictText}>
                              {cartIssue.reason}
                            </Text>
                          ) : null}
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.addHint,
                            isUnavailable && styles.addHintDisabled,
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={
                              isUnavailable
                                ? "close-circle-outline"
                                : "plus-circle-outline"
                            }
                            size={14}
                            color={
                              isUnavailable ? colors.terracotta : colors.textMuted
                            }
                          />
                          <Text
                            style={[
                              styles.addHintText,
                              isUnavailable && styles.addHintTextDisabled,
                            ]}
                          >
                            {isUnavailable ? "Unavailable" : "Add"}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
            );
          })
        )}

        <View style={{ height: cart.length > 0 ? 228 : 24 }} />
      </ScrollView>

      {cart.length > 0 && (
        <View style={styles.checkoutDock}>
          <View style={styles.billToolsCard}>
            <View style={styles.billToolsContent}>
              <View style={styles.billToolsTextWrap}>
                <Text style={styles.billToolsTitle}>Current Bill</Text>
                <Text style={styles.billToolsMeta}>
                  {cart.length} {cart.length === 1 ? "product" : "products"} selected
                  {" · "}
                  {totalCartUnits} {totalCartUnits === 1 ? "unit" : "units"}
                </Text>
              </View>
              {cartStockIssues.length > 0 ? (
                <View style={styles.billIssueCard}>
                  <View style={styles.billIssueHeader}>
                    <MaterialCommunityIcons
                      name="alert-outline"
                      size={16}
                      color={colors.terracotta}
                    />
                    <Text style={styles.billIssueTitle}>Stock Changed</Text>
                  </View>
                  <Text style={styles.billIssueText}>
                    {cartStockIssues[0].productName}: {cartStockIssues[0].reason}
                  </Text>
                  {cartStockIssues.length > 1 ? (
                    <Text style={styles.billIssueCount}>
                      +{cartStockIssues.length - 1} more item
                      {cartStockIssues.length - 1 === 1 ? "" : "s"} need attention
                    </Text>
                  ) : null}
                  <Pressable
                    onPress={handleAutoAdjustCurrentBill}
                    style={({ pressed }) => [
                      styles.billIssueActionBtn,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="auto-fix"
                      size={14}
                      color={colors.white}
                    />
                    <Text style={styles.billIssueActionText}>Auto Adjust Bill</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
            <Pressable
              onPress={handleClearCurrentBill}
              style={({ pressed }) => [
                styles.clearBillBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={16}
                color={colors.terracotta}
              />
              <Text style={styles.clearBillBtnText}>Clear Bill</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push("/checkout")}
            disabled={cartStockIssues.length > 0}
            style={({ pressed }) => [
              styles.checkoutBar,
              cartStockIssues.length > 0 && styles.checkoutBarDisabled,
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
                {cartStockIssues.length > 0
                  ? "Review stock to continue"
                  : `Checkout (${totalCartUnits} ${
                      totalCartUnits === 1 ? "unit" : "units"
                    })`}
              </Text>
            </View>
            <Text style={styles.checkoutTotal}>Rs. {grandTotal.toFixed(2)}</Text>
          </Pressable>
        </View>
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
  clearSearchButton: {
    marginLeft: 8,
    paddingVertical: 2,
  },
  searchMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: -2,
    marginBottom: 2,
  },
  searchHelperText: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  searchCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  searchContextText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: -2,
    marginBottom: 2,
  },
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
  stockChips: { gap: 8, paddingBottom: 4 },
  stockLegendText: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: -2,
    marginBottom: 2,
  },
  stockChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  stockChipActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  stockChipLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
  },
  stockChipLabelActive: {
    color: colors.primary,
  },
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
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  retryInlineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.terracottaSoft + "40",
    borderWidth: 1,
    borderColor: colors.terracottaSoft,
  },
  retryInlineBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.terracotta,
  },
  loadingBlock: {
    alignItems: "center",
    gap: 10,
    paddingTop: 40,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  empty: { alignItems: "center", paddingTop: 48, gap: 12 },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  emptyActions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  emptyActionButton: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyActionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
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
  productCardDisabled: {
    opacity: 0.72,
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
  productMetaTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  productMetaTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.primaryContainer + "50",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  productMetaTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
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
  inventoryStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
    flexWrap: "wrap",
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
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
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  qtyStepperBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  qtyStepperBtnDisabled: {
    backgroundColor: colors.surfaceHigh,
  },
  qtyStepperValue: {
    minWidth: 24,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
  },
  stockLimitText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.secondary,
  },
  stockConflictText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.terracotta,
    maxWidth: 160,
    textAlign: "right",
  },
  addHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 24,
  },
  addHintDisabled: {
    backgroundColor: colors.terracottaSoft + "40",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addHintText: { fontSize: 12, color: colors.textMuted },
  addHintTextDisabled: {
    color: colors.terracotta,
    fontWeight: "700",
  },
  checkoutDock: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 20,
    gap: 10,
  },
  billToolsCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant + "80",
    ...theme.shadows.card,
  },
  billToolsContent: {
    flex: 1,
    gap: 10,
  },
  billToolsTextWrap: {
    gap: 2,
  },
  billToolsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  billToolsMeta: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  clearBillBtn: {
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
  clearBillBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.terracotta,
  },
  billIssueCard: {
    gap: 6,
    backgroundColor: colors.terracottaSoft + "40",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.terracottaSoft,
    padding: 10,
  },
  billIssueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  billIssueTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.terracotta,
  },
  billIssueText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.terracotta,
  },
  billIssueCount: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.terracotta,
  },
  billIssueActionBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  billIssueActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.white,
  },
  checkoutBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...theme.shadows.card,
  },
  checkoutBarDisabled: {
    opacity: 0.8,
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


