import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, RefreshControl,
} from "react-native";
import { alertApi, inventoryApi, productApi } from "../services/api";
import { shared, colors, LEVEL_CONFIG } from "../constants/styles";
import { AlertLevelBadge, Banner, EmptyState, Spinner, FilterTabs } from "../components/shared";

// ─── Helper ───────────────────────────────────────────────────────────────────
const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
};

const getAlertLevel = (item, productRiskMap) => {
  const aiRisk = productRiskMap[item.productId] || "LOW";
  const days   = daysUntil(item.expiryDate);
  if (aiRisk === "HIGH" || days <= 7  || item.quantity === 0) return "CRITICAL";
  if (days <= 14 || item.quantity <= 5)                        return "HIGH";
  if (days <= 30 || item.quantity <= 10)                       return "MEDIUM";
  return "LOW";
};

// ─── Summary Card ─────────────────────────────────────────────────────────────
const SummaryCard = ({ emoji, label, value, color }) => (
  <View style={[styles.summaryCard, { borderTopColor: color }]}>
    <Text style={{ fontSize: 20 }}>{emoji}</Text>
    <Text style={{ fontSize: 22, fontWeight: "900", color, marginTop: 4 }}>{value}</Text>
    <Text style={[shared.micro, { color: colors.inkLight, textAlign: "center", marginTop: 4 }]}>{label}</Text>
  </View>
);

// ─── Alert Row ────────────────────────────────────────────────────────────────
const AlertRow = ({ item }) => {
  const days     = item.daysLeft;
  const expired  = days !== null && days < 0;
  const urgent   = days !== null && days <= 7;
  const aiRisk   = item.aiRisk || "LOW";
  const levelCfg = LEVEL_CONFIG[item.alertLevel] || LEVEL_CONFIG.LOW;

  return (
    <View style={[styles.alertRow, { borderLeftColor: levelCfg.color }]}>
      {/* Product / Batch */}
      <View style={styles.alertMain}>
        <Text style={shared.bodyBold} numberOfLines={1}>{item.productName}</Text>
        <Text style={[shared.micro, { color: colors.inkLight, marginTop: 2 }]}>
          Batch: {item.batchNumber}
        </Text>

        {/* Expiry + Days */}
        <View style={[shared.row, { gap: 10, marginTop: 8, flexWrap: "wrap" }]}>
          <View style={styles.metaChip}>
            <Text style={[shared.micro, { color: expired || urgent ? colors.critical : colors.inkLight }]}>
              {expired ? "⚠ EXPIRED" : item.expiryDate || "—"}
            </Text>
          </View>

          {days !== null && (
            <View style={styles.metaChip}>
              <Text style={[shared.micro, {
                color: expired ? colors.critical : urgent ? colors.critical : days <= 14 ? colors.high : colors.inkLight,
              }]}>
                {expired ? "Expired" : `${days}d left`}
              </Text>
            </View>
          )}

          <View style={styles.metaChip}>
            <Text style={[shared.micro, {
              color: item.quantity === 0 ? colors.critical : item.quantity <= 5 ? colors.high : colors.inkLight,
            }]}>
              {item.quantity === 0 ? "Out of stock" : `Qty: ${item.quantity}`}
            </Text>
          </View>
        </View>
      </View>

      {/* Right: AI risk + alert level */}
      <View style={{ alignItems: "flex-end", gap: 8, marginLeft: 8 }}>
        <View style={[
          shared.pill,
          {
            backgroundColor: aiRisk === "HIGH" ? "#FEE2E2" : colors.successBg,
          },
        ]}>
          <Text style={[shared.pillText, {
            color: aiRisk === "HIGH" ? colors.critical : colors.success,
          }]}>
            {aiRisk === "HIGH" ? "High Risk" : "Low Risk"}
          </Text>
        </View>
        <AlertLevelBadge level={item.alertLevel} />
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminAlertsScreen() {
  const [inventory, setInventory]     = useState([]);
  const [products, setProducts]       = useState({});
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const [levelFilter, setLevelFilter] = useState("ALL");
  const [sortBy, setSortBy]           = useState("expiry");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Load data ───────────────────────────────────────────────────────────────
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const [invRes, prodRes] = await Promise.all([
        inventoryApi.getAll(),
        productApi.getAll(),
      ]);

      if (!invRes.ok) throw new Error("Failed to load inventory");

      const invData  = await invRes.json();
      const prodData = prodRes.ok ? await prodRes.json() : [];

      const prodMap = {};
      prodData.forEach((p) => { prodMap[p.id || p.productId] = p.riskLevel || "LOW"; });
      setProducts(prodMap);

      setInventory(
        (Array.isArray(invData) ? invData : []).sort(
          (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)
        )
      );
      setLastUpdated(new Date());
    } catch {
      setError("Failed to load alert data. Pull to refresh.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const annotatedItems = useMemo(() =>
    inventory.map((item) => ({
      ...item,
      alertLevel: getAlertLevel(item, products),
      aiRisk:     products[item.productId] || "LOW",
      daysLeft:   daysUntil(item.expiryDate),
    })),
  [inventory, products]);

  const summary = useMemo(() => {
    const count = (lvl) => annotatedItems.filter((i) => i.alertLevel === lvl).length;
    return {
      total:    annotatedItems.filter((i) => i.alertLevel !== "LOW").length,
      critical: count("CRITICAL"),
      high:     count("HIGH"),
      medium:   count("MEDIUM"),
    };
  }, [annotatedItems]);

  const displayItems = useMemo(() => {
    let list = annotatedItems.filter((i) => i.alertLevel !== "LOW");

    if (levelFilter !== "ALL") list = list.filter((i) => i.alertLevel === levelFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((i) =>
        (i.productName || "").toLowerCase().includes(q) ||
        (i.batchNumber || "").toLowerCase().includes(q)
      );
    }

    if (sortBy === "expiry")    list.sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999));
    else if (sortBy === "level") {
      const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      list.sort((a, b) => order[a.alertLevel] - order[b.alertLevel]);
    } else if (sortBy === "quantity") list.sort((a, b) => a.quantity - b.quantity);

    return list;
  }, [annotatedItems, levelFilter, sortBy, searchQuery]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={shared.screen}
      contentContainerStyle={shared.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.primary} />}
    >
      <View style={{ padding: 16 }}>

        {/* Header */}
        <View style={[shared.rowBetween, { marginBottom: 20 }]}>
          <View>
            <Text style={shared.pageTitle}>Risk Control</Text>
            <Text style={shared.pageSubtitle}>Expiry & Inventory Alerts</Text>
          </View>
          <TouchableOpacity
            style={[shared.btnOutline, { flexDirection: "row", alignItems: "center", gap: 4 }]}
            onPress={() => loadData(true)}
          >
            <Text style={{ fontSize: 14 }}>↻</Text>
            <Text style={shared.btnOutlineText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {lastUpdated && (
          <Text style={[shared.micro, { color: colors.inkLight, marginBottom: 14 }]}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Text>
        )}

        <Banner type="error" message={error} onClose={() => setError("")} />

        {loading ? (
          <Spinner label="Scanning inventory…" />
        ) : (
          <>
            {/* Summary cards */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={[shared.row, { gap: 10, paddingRight: 16 }]}>
                <SummaryCard emoji="🔴" label="Critical"    value={summary.critical} color={colors.critical} />
                <SummaryCard emoji="🟠" label="High Risk"   value={summary.high}     color={colors.high} />
                <SummaryCard emoji="🟡" label="Medium"      value={summary.medium}   color={colors.medium} />
                <SummaryCard emoji="📦" label="Total Alerts" value={summary.total}   color={colors.primary} />
              </View>
            </ScrollView>

            {/* Table card */}
            <View style={shared.card}>
              <View style={{ marginBottom: 14 }}>
                <Text style={shared.sectionTitle}>Expiry & Stock Monitor</Text>
                <Text style={[shared.micro, { color: colors.inkLight, marginTop: 2 }]}>
                  {displayItems.length} alert{displayItems.length !== 1 ? "s" : ""}
                  {levelFilter !== "ALL" ? ` · ${levelFilter}` : ""}
                </Text>
              </View>

              {/* Search */}
              <TextInput
                style={[shared.input, { height: 40, marginBottom: 10 }]}
                placeholder="Search product or batch…"
                placeholderTextColor={colors.inkLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              {/* Level filter tabs */}
              <FilterTabs
                options={[
                  { label: "All",      value: "ALL" },
                  { label: "Critical", value: "CRITICAL" },
                  { label: "High",     value: "HIGH" },
                  { label: "Medium",   value: "MEDIUM" },
                ]}
                active={levelFilter}
                onSelect={setLevelFilter}
              />

              {/* Sort */}
              <View style={[shared.row, { gap: 8, marginTop: 10, marginBottom: 14 }]}>
                <Text style={[shared.micro, { color: colors.inkLight }]}>Sort:</Text>
                {[
                  { label: "Expiry",   value: "expiry" },
                  { label: "Level",    value: "level" },
                  { label: "Qty",      value: "quantity" },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setSortBy(opt.value)}
                    style={[
                      styles.sortBtn,
                      sortBy === opt.value && { backgroundColor: colors.ink },
                    ]}
                  >
                    <Text style={[shared.micro, { color: sortBy === opt.value ? "#fff" : colors.inkLight }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Alert list */}
              {displayItems.length === 0 ? (
                <EmptyState
                  icon="✅"
                  text={
                    inventory.length === 0
                      ? "No inventory data found."
                      : levelFilter !== "ALL"
                      ? `No ${levelFilter.toLowerCase()} alerts right now.`
                      : "No alerts — inventory looks healthy!"
                  }
                />
              ) : (
                displayItems.map((item) => (
                  <AlertRow key={item.id ?? item._id} item={item} />
                ))
              )}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    minWidth: 90,
    borderTopWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  alertRow: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  alertMain:  { flex: 1 },
  metaChip:   { backgroundColor: colors.inkFaint, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  sortBtn:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.inkFaint },
});
