import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProducts } from '../../api';
import { MAIN_BOTTOM_NAV_HEIGHT } from '../../components/BottomNav';
import WorkspaceHeader from '../../components/WorkspaceHeader';
import { usePosCart } from '../../context/posCart';
import SalesProductImage from '../../sales/components/SalesProductImage';
import SalesStatusBadge from '../../sales/components/SalesStatusBadge';
import { salesColors, salesTheme } from '../../sales/theme';
import {
  formatCategoryLabel,
  formatNearestExpiry,
  getCartStockIssues,
  getExpiryStatus,
  getStockStatus,
  matchesProductSearch,
  normalizeCategoryKey,
  SALES_STOCK_FILTERS,
} from '../../sales/utils';
import { colors } from '../../theme';

function getStockFilterLabel(value) {
  if (value === 'IN_STOCK') return 'In Stock';
  if (value === 'LOW_STOCK') return 'Low Stock';
  if (value === 'UNAVAILABLE') return 'Unavailable';
  return 'All Stock';
}

export default function SalesPosScreen({
  go,
  sessionUser,
  onLogout,
  onOpenCheckout,
}) {
  const {
    cart,
    addProduct,
    incrementProduct,
    decrementProduct,
    updateQuantity,
    removeProduct,
    clearCart,
  } = usePosCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL_STOCK');

  const loadProducts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMsg('');
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      setErrorMsg(error.message || 'Could not load products.');
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
          .map((product) => normalizeCategoryKey(product.category))
          .filter(Boolean)
      )
    ).sort((left, right) => left.localeCompare(right));

    return ['ALL', ...categories];
  }, [products]);

  useEffect(() => {
    if (activeCategory !== 'ALL' && !categoryChips.includes(activeCategory)) {
      setActiveCategory('ALL');
    }
  }, [activeCategory, categoryChips]);

  const filteredProducts = useMemo(() => (
    products.filter((product) => {
      if (!product?.isActive) return false;

      const matchSearch = matchesProductSearch(product, searchQuery);
      const matchCategory = activeCategory === 'ALL'
        || normalizeCategoryKey(product.category) === activeCategory;

      const stockStatus = getStockStatus(product);
      const matchStock = stockFilter === 'ALL_STOCK'
        || (stockFilter === 'IN_STOCK' && stockStatus === 'in-stock')
        || (stockFilter === 'LOW_STOCK' && stockStatus === 'low-stock')
        || (stockFilter === 'UNAVAILABLE' && stockStatus === 'critical');

      return matchSearch && matchCategory && matchStock;
    })
  ), [products, searchQuery, activeCategory, stockFilter]);

  const productMap = useMemo(() => (
    products.reduce((map, product) => {
      map[product._id] = product;
      return map;
    }, {})
  ), [products]);

  const cartStockIssues = useMemo(() => getCartStockIssues(cart, productMap), [cart, productMap]);
  const totalCartUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const cartDiscount = cart.reduce(
    (sum, item) => sum + (item.quantity * item.unitPrice * (item.discountRate / 100)),
    0
  );
  const grandTotal = +(cartSubtotal - cartDiscount).toFixed(2);
  const totalItems = products.length;
  const criticalCount = products.filter((product) => getStockStatus(product) === 'critical').length;
  const hasSearchQuery = searchQuery.trim().length > 0;

  function handleClearCurrentBill() {
    Alert.alert('Clear Current Bill', 'Remove all selected products from this bill?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear Bill', style: 'destructive', onPress: clearCart },
    ]);
  }

  function handleAutoAdjustCurrentBill() {
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
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.root}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProducts(true)} />}
        >
          <WorkspaceHeader
            pillLabel={`${String(sessionUser?.role || 'STAFF').toUpperCase()} Sales Workspace`}
            pillIcon="cart-outline"
            onLogout={onLogout}
            go={go}
            role={sessionUser?.role}
            sessionUser={sessionUser}
          />

          <View style={styles.searchWrap}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={salesColors.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, SKU, or barcode..."
              placeholderTextColor={salesColors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {hasSearchQuery ? (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color={salesColors.textMuted}
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
                {filteredProducts.length} {filteredProducts.length === 1 ? 'result' : 'results'}
              </Text>
            ) : null}
          </View>

          {(activeCategory !== 'ALL' || stockFilter !== 'ALL_STOCK') ? (
            <Text style={styles.searchContextText}>
              Showing {activeCategory === 'ALL' ? 'All Categories' : formatCategoryLabel(activeCategory)}
              {' | '}
              {getStockFilterLabel(stockFilter)}
            </Text>
          ) : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {categoryChips.map((chip) => (
              <Pressable
                key={chip}
                onPress={() => setActiveCategory(chip)}
                style={[styles.chip, activeCategory === chip && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, activeCategory === chip && styles.chipLabelActive]}>
                  {chip === 'ALL' ? 'All' : formatCategoryLabel(chip)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stockChips}>
            {SALES_STOCK_FILTERS.map((chip) => {
              const selected = stockFilter === chip;
              return (
                <Pressable
                  key={chip}
                  onPress={() => setStockFilter(chip)}
                  style={[styles.stockChip, selected && styles.stockChipActive]}
                >
                  <Text style={[styles.stockChipLabel, selected && styles.stockChipLabelActive]}>
                    {getStockFilterLabel(chip)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.stockLegendText}>
            Low Stock means 5 or fewer sellable units. Unavailable means 0 sellable units.
          </Text>

          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: salesColors.primaryContainer }]}>
              <Text style={[styles.summaryLabel, { color: salesColors.onPrimaryContainer }]}>
                TOTAL ITEMS
              </Text>
              <Text style={[styles.summaryValue, { color: salesColors.onPrimaryContainer }]}>
                {loading ? '-' : totalItems}
              </Text>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: salesColors.tertiaryContainer }]}>
              <Text style={[styles.summaryLabel, { color: salesColors.onTertiaryContainer }]}>
                CRITICAL
              </Text>
              <Text style={[styles.summaryValue, { color: salesColors.onTertiaryContainer }]}>
                {loading ? '-' : criticalCount}
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
              <ActivityIndicator color={salesColors.primary} />
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons
                name="package-variant-closed-remove"
                size={48}
                color={salesColors.outline}
              />
              <Text style={styles.emptyText}>No products matched this view.</Text>
              <Text style={styles.emptySubtext}>
                Try another search or clear the current category and stock filters.
              </Text>
            </View>
          ) : (
            filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product);
              const expiryStatus = getExpiryStatus(product);
              const sellableUnits = Number(product.sellableUnits || 0);
              const inCart = cart.find((item) => item.productId === product._id);
              const isUnavailable = sellableUnits <= 0;
              const maxInCartReached = Boolean(inCart && inCart.quantity >= sellableUnits && sellableUnits > 0);
              const cartIssue = cartStockIssues.find((issue) => issue.productId === product._id);
              const accentColor = cartIssue
                ? salesColors.terracotta
                : stockStatus === 'critical'
                  ? salesColors.terracotta
                  : stockStatus === 'low-stock'
                    ? salesColors.secondary
                    : salesColors.primary;

              return (
                <Pressable
                  key={product._id}
                  onPress={() => {
                    if (!isUnavailable) addProduct(product);
                  }}
                  disabled={isUnavailable}
                  style={({ pressed }) => [
                    styles.productCard,
                    { borderLeftColor: accentColor },
                    isUnavailable && styles.productCardDisabled,
                    pressed && !isUnavailable && styles.productCardPressed,
                  ]}
                >
                  <SalesProductImage
                    imageUrl={product.imageUrl}
                    productName={product.name}
                    category={product.category}
                    size={64}
                    borderRadius={16}
                  />

                  <View style={styles.productBody}>
                    <View style={styles.productRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                        <Text style={styles.productCategory}>
                          CATEGORY: {String(product.category || 'General').toUpperCase()}
                        </Text>
                      </View>
                      <SalesStatusBadge variant={stockStatus} />
                    </View>

                    <View style={styles.productMetaTags}>
                      {product.sku ? (
                        <View style={styles.productMetaTag}>
                          <MaterialCommunityIcons name="tag-outline" size={12} color={salesColors.primary} />
                          <Text style={styles.productMetaTagText}>SKU {product.sku}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.inventoryMetaRow}>
                      <Text style={styles.inventoryMetaText}>{sellableUnits} units sellable</Text>
                      <Text style={styles.inventoryMetaDivider}>|</Text>
                      <Text style={styles.inventoryMetaText}>
                        {Number(product.activeBatchCount || 0)} {Number(product.activeBatchCount || 0) === 1 ? 'batch' : 'batches'}
                      </Text>
                    </View>

                    <View style={styles.inventoryStatusRow}>
                      <SalesStatusBadge variant={expiryStatus.variant} label={expiryStatus.label} />
                      <Text style={styles.inventoryMetaSubtle}>
                        Nearest expiry: {formatNearestExpiry(product.nearestExpiryDate)}
                      </Text>
                    </View>

                    <View style={styles.productFooter}>
                      <Text style={styles.productPrice}>
                        Rs. {Number(product.sellingPrice || 0).toFixed(2)}
                      </Text>

                      {inCart ? (
                        <View style={styles.productControlWrap}>
                          <Text style={styles.inBillText}>In bill</Text>
                          <View style={styles.qtyStepper}>
                            <Pressable onPress={() => decrementProduct(product._id)} hitSlop={8} style={styles.qtyStepperBtn}>
                              <MaterialCommunityIcons name="minus" size={14} color={salesColors.primary} />
                            </Pressable>
                            <Text style={styles.qtyStepperValue}>{inCart.quantity}</Text>
                            <Pressable
                              onPress={() => incrementProduct(product)}
                              disabled={maxInCartReached}
                              hitSlop={8}
                              style={[styles.qtyStepperBtn, maxInCartReached && styles.qtyStepperBtnDisabled]}
                            >
                              <MaterialCommunityIcons
                                name="plus"
                                size={14}
                                color={maxInCartReached ? salesColors.outline : salesColors.primary}
                              />
                            </Pressable>
                          </View>
                          {maxInCartReached ? (
                            <Text style={styles.stockLimitText}>Max sellable quantity reached</Text>
                          ) : cartIssue ? (
                            <Text style={styles.stockConflictText}>{cartIssue.reason}</Text>
                          ) : null}
                        </View>
                      ) : (
                        <View style={[styles.addHint, isUnavailable && styles.addHintDisabled]}>
                          <MaterialCommunityIcons
                            name={isUnavailable ? 'close-circle-outline' : 'plus-circle-outline'}
                            size={14}
                            color={isUnavailable ? salesColors.terracotta : salesColors.textMuted}
                          />
                          <Text style={[styles.addHintText, isUnavailable && styles.addHintTextDisabled]}>
                            {isUnavailable ? 'Unavailable' : 'Add'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}

          <View style={{ height: cart.length > 0 ? 250 : 28 }} />
        </ScrollView>

        {cart.length > 0 ? (
          <View style={styles.checkoutDock}>
            <View style={styles.billToolsCard}>
              <View style={styles.billToolsContent}>
                <View style={styles.billToolsTextWrap}>
                  <Text style={styles.billToolsTitle}>Current Bill</Text>
                  <Text style={styles.billToolsMeta}>
                    {cart.length} {cart.length === 1 ? 'product' : 'products'} selected
                    {' | '}
                    {totalCartUnits} {totalCartUnits === 1 ? 'unit' : 'units'}
                  </Text>
                </View>

                {cartStockIssues.length > 0 ? (
                  <View style={styles.billIssueCard}>
                    <View style={styles.billIssueHeader}>
                      <MaterialCommunityIcons name="alert-outline" size={16} color={salesColors.terracotta} />
                      <Text style={styles.billIssueTitle}>Stock Changed</Text>
                    </View>
                    <Text style={styles.billIssueText}>
                      {cartStockIssues[0].productName}: {cartStockIssues[0].reason}
                    </Text>
                    {cartStockIssues.length > 1 ? (
                      <Text style={styles.billIssueCount}>
                        +{cartStockIssues.length - 1} more item{cartStockIssues.length - 1 === 1 ? '' : 's'} need attention
                      </Text>
                    ) : null}
                    <Pressable onPress={handleAutoAdjustCurrentBill} style={styles.billIssueActionBtn}>
                      <MaterialCommunityIcons name="auto-fix" size={14} color={salesColors.white} />
                      <Text style={styles.billIssueActionText}>Auto Adjust Bill</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>

              <Pressable onPress={handleClearCurrentBill} style={styles.clearBillBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={16} color={salesColors.terracotta} />
                <Text style={styles.clearBillBtnText}>Clear Bill</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={onOpenCheckout}
              disabled={cartStockIssues.length > 0}
              style={[styles.checkoutBar, cartStockIssues.length > 0 && styles.checkoutBarDisabled]}
            >
              <View style={styles.checkoutLeft}>
                <MaterialCommunityIcons name="cart-outline" size={18} color={salesColors.white} />
                <Text style={styles.checkoutText}>
                  {cartStockIssues.length > 0
                    ? 'Review stock to continue'
                    : `Checkout (${totalCartUnits} ${totalCartUnits === 1 ? 'unit' : 'units'})`}
                </Text>
              </View>
              <Text style={styles.checkoutTotal}>Rs. {grandTotal.toFixed(2)}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: MAIN_BOTTOM_NAV_HEIGHT + 48,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: salesColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: salesColors.outlineVariant,
    paddingHorizontal: 14,
    height: 48,
    marginTop: 8,
    ...salesTheme.shadows.card,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: salesColors.text,
  },
  searchMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  searchHelperText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: salesColors.textMuted,
  },
  searchCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: salesColors.primary,
  },
  searchContextText: {
    marginTop: 6,
    fontSize: 12,
    color: salesColors.textMuted,
  },
  chips: {
    gap: 8,
    paddingTop: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: salesColors.surfaceHighest,
  },
  chipActive: {
    backgroundColor: salesColors.primary,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: salesColors.textMuted,
  },
  chipLabelActive: {
    color: salesColors.white,
  },
  stockChips: {
    gap: 8,
    paddingTop: 10,
  },
  stockChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: salesColors.surfaceLow,
    borderWidth: 1,
    borderColor: salesColors.outlineVariant,
  },
  stockChipActive: {
    backgroundColor: salesColors.primaryContainer,
    borderColor: salesColors.primaryContainer,
  },
  stockChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: salesColors.textMuted,
  },
  stockChipLabelActive: {
    color: salesColors.primary,
  },
  stockLegendText: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 16,
    color: salesColors.textMuted,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 18,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    gap: 6,
    ...salesTheme.shadows.card,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '700',
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 12,
    fontSize: 28,
    fontWeight: '900',
    color: colors.slate,
    letterSpacing: -0.8,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: salesColors.terracotta,
  },
  retryInlineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: `${salesColors.tertiaryContainer}88`,
    borderWidth: 1,
    borderColor: salesColors.tertiaryContainer,
  },
  retryInlineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: salesColors.terracotta,
  },
  loadingBlock: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 30,
  },
  loadingText: {
    fontSize: 14,
    color: salesColors.textMuted,
  },
  empty: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 36,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: salesColors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    lineHeight: 20,
    color: salesColors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: salesColors.surface,
    borderRadius: 16,
    padding: 14,
    gap: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: `${salesColors.outlineVariant}66`,
    borderLeftWidth: 4,
    ...salesTheme.shadows.card,
  },
  productCardDisabled: {
    opacity: 0.72,
  },
  productCardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
  productBody: {
    flex: 1,
    gap: 4,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  productName: {
    fontSize: 20,
    fontWeight: '800',
    color: salesColors.text,
  },
  productCategory: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: salesColors.textMuted,
  },
  productMetaTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  productMetaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${salesColors.primaryContainer}66`,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  productMetaTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: salesColors.primary,
  },
  inventoryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  inventoryMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: salesColors.textMuted,
  },
  inventoryMetaDivider: {
    fontSize: 11,
    color: salesColors.outline,
  },
  inventoryStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  inventoryMetaSubtle: {
    fontSize: 11,
    color: salesColors.textMuted,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: salesColors.primary,
  },
  productControlWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  inBillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: salesColors.primary,
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: `${salesColors.primaryContainer}88`,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  qtyStepperBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: salesColors.surface,
  },
  qtyStepperBtnDisabled: {
    backgroundColor: salesColors.surfaceHighest,
  },
  qtyStepperValue: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: salesColors.primary,
  },
  stockLimitText: {
    fontSize: 10,
    fontWeight: '600',
    color: salesColors.secondary,
  },
  stockConflictText: {
    maxWidth: 180,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'right',
    color: salesColors.terracotta,
  },
  addHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 24,
  },
  addHintDisabled: {
    backgroundColor: `${salesColors.tertiaryContainer}55`,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addHintText: {
    fontSize: 12,
    color: salesColors.textMuted,
  },
  addHintTextDisabled: {
    color: salesColors.terracotta,
    fontWeight: '700',
  },
  checkoutDock: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 112,
    gap: 10,
  },
  billToolsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: salesColors.surface,
    borderWidth: 1,
    borderColor: `${salesColors.outlineVariant}AA`,
    ...salesTheme.shadows.card,
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
    fontWeight: '700',
    color: salesColors.primary,
  },
  billToolsMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: salesColors.textMuted,
  },
  clearBillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: `${salesColors.tertiaryContainer}55`,
    borderWidth: 1,
    borderColor: salesColors.tertiaryContainer,
  },
  clearBillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: salesColors.terracotta,
  },
  billIssueCard: {
    gap: 6,
    backgroundColor: `${salesColors.tertiaryContainer}40`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: salesColors.tertiaryContainer,
    padding: 10,
  },
  billIssueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  billIssueTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: salesColors.terracotta,
  },
  billIssueText: {
    fontSize: 12,
    lineHeight: 18,
    color: salesColors.terracotta,
  },
  billIssueCount: {
    fontSize: 11,
    fontWeight: '600',
    color: salesColors.terracotta,
  },
  billIssueActionBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: salesColors.primary,
  },
  billIssueActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: salesColors.white,
  },
  checkoutBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: salesColors.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...salesTheme.shadows.card,
  },
  checkoutBarDisabled: {
    opacity: 0.8,
  },
  checkoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  checkoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: salesColors.white,
  },
  checkoutTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: salesColors.white,
  },
});
