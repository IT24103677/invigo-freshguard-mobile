import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, RefreshControl, Switch, Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { discountApi, productApi, inventoryApi } from "../services/api";
import { shared, colors } from "../constants/styles";
import {
  StatCard, Pill, Banner, ToggleSwitch, EmptyState, Spinner,
  SectionHeader, FilterTabs,
} from "../components/shared";

// ─── Helper ───────────────────────────────────────────────────────────────────
const daysLeft = (dateStr) => {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
};

// ─── EditBox (inline edit for a discount) ────────────────────────────────────
const EditBox = ({ discount, onSave, onCancel, saving }) => {
  const [pct, setPct]       = useState(String(discount.discountPercent));
  const [note, setNote]     = useState(discount.note || "");
  const [active, setActive] = useState(discount.active);

  return (
    <View style={styles.editBox}>
      {/* Discount % */}
      <View style={styles.editRow}>
        <Text style={shared.label}>Discount %</Text>
        <View style={styles.suffixRow}>
          <TextInput
            style={[shared.input, { flex: 1, height: 44 }]}
            keyboardType="numeric"
            value={pct}
            onChangeText={setPct}
            maxLength={2}
            placeholder="1–90"
            placeholderTextColor={colors.inkLight}
          />
          <Text style={styles.suffix}>%</Text>
        </View>
      </View>

      {/* Note */}
      <View style={styles.editRow}>
        <Text style={shared.label}>Note</Text>
        <TextInput
          style={[shared.input, { flex: 1, height: 44 }]}
          value={note}
          onChangeText={setNote}
          maxLength={200}
          placeholder="Optional note…"
          placeholderTextColor={colors.inkLight}
        />
      </View>

      {/* Active toggle */}
      <View style={[styles.editRow, { alignItems: "center" }]}>
        <Text style={shared.label}>Active</Text>
        <View style={shared.row}>
          <Switch
            value={active}
            onValueChange={setActive}
            trackColor={{ true: colors.primary, false: "#D1D5DB" }}
            thumbColor="#fff"
          />
          <Text style={[shared.bodyMuted, { marginLeft: 8 }]}>
            {active ? "Live" : "Paused"}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={[shared.row, { gap: 8, marginTop: 4 }]}>
        <TouchableOpacity
          style={[shared.btnPrimary, { flex: 1, opacity: saving ? 0.6 : 1 }]}
          onPress={() => onSave({ discountPercent: Number(pct), note, active })}
          disabled={saving}
        >
          <Text style={shared.btnPrimaryText}>{saving ? "Saving…" : "Save"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={shared.btnGhost} onPress={onCancel}>
          <Text style={shared.btnGhostText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── CreateForm ───────────────────────────────────────────────────────────────
const CreateForm = ({ products, onSubmit, saving }) => {
  const [productId, setProductId]     = useState("");
  const [batches, setBatches]         = useState([]);
  const [batchId, setBatchId]         = useState("");
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [pct, setPct]                 = useState("");
  const [note, setNote]               = useState("");
  const [loadingBatches, setLoadingBatches] = useState(false);

  const loadBatches = async (pid) => {
    if (!pid) { setBatches([]); setBatchId(""); setSelectedBatch(null); return; }
    try {
      setLoadingBatches(true);
      const res = await productApi.getBatchesByProduct(pid);
      const data = res.ok ? await res.json() : [];
      setBatches(Array.isArray(data) ? data : []);
    } catch { setBatches([]); }
    finally { setLoadingBatches(false); }
  };

  const handleSubmit = () => {
    const p = Number(pct);
    if (!productId) { Alert.alert("Validation", "Select a product."); return; }
    if (!batchId)   { Alert.alert("Validation", "Select a batch."); return; }
    if (!p || p < 1 || p > 90 || !Number.isInteger(p)) {
      Alert.alert("Validation", "Discount must be a whole number between 1 and 90.");
      return;
    }
    const batch = batches.find((b) => String(b.id ?? b._id) === String(batchId));
    const product = products.find((pr) => String(pr.id) === String(productId));
    onSubmit({
      productId: Number(productId),
      productName: product?.name || "",
      batchId: Number(batchId),
      batchNumber: batch?.batchNumber || "",
      discountPercent: p,
      note: note.trim() || null,
      source: "MANUAL",
    });
  };

  return (
    <View>
      {/* Product picker (simple list – replace with a proper picker/modal if needed) */}
      <View style={styles.field}>
        <Text style={shared.label}>Product</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
          <View style={shared.row}>
            {products.map((p) => {
              const sel = String(p.id) === String(productId);
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => { setProductId(String(p.id)); loadBatches(p.id); setBatchId(""); setSelectedBatch(null); }}
                  style={[styles.chipBtn, sel && styles.chipActive]}
                >
                  <Text style={[styles.chipText, sel && styles.chipActiveText]}>{p.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Batch picker */}
      {productId ? (
        <View style={styles.field}>
          <Text style={shared.label}>Batch {loadingBatches ? "(Loading…)" : ""}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={shared.row}>
              {batches.map((b) => {
                const id = String(b.id ?? b._id);
                const sel = id === String(batchId);
                const days = daysLeft(b.expiryDate);
                return (
                  <TouchableOpacity
                    key={id}
                    onPress={() => { setBatchId(id); setSelectedBatch(b); }}
                    style={[styles.chipBtn, sel && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, sel && styles.chipActiveText]}>
                      {b.batchNumber}{days !== null ? ` (${days}d)` : ""}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {batches.length === 0 && !loadingBatches && (
                <Text style={shared.bodyMuted}>No batches found</Text>
              )}
            </View>
          </ScrollView>
        </View>
      ) : null}

      {/* Preview */}
      {selectedBatch && (
        <View style={styles.previewRow}>
          <Text style={[shared.bodyBold, { flex: 1 }]}>{selectedBatch.productName || "—"}</Text>
          <View style={shared.row}>
            <View style={[shared.pill, { backgroundColor: colors.inkFaint, marginRight: 6 }]}>
              <Text style={[shared.pillText, { color: colors.inkLight }]}>Qty: {selectedBatch.quantity}</Text>
            </View>
            <View style={[shared.pill, { backgroundColor: colors.inkFaint }]}>
              <Text style={[shared.pillText, { color: colors.inkLight }]}>Rs.{selectedBatch.sellingPrice?.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Discount % */}
      <View style={styles.field}>
        <Text style={shared.label}>Discount Percent</Text>
        <View style={styles.suffixRow}>
          <TextInput
            style={[shared.input, { flex: 1 }]}
            keyboardType="numeric"
            value={pct}
            onChangeText={setPct}
            maxLength={2}
            placeholder="e.g. 20"
            placeholderTextColor={colors.inkLight}
          />
          <Text style={styles.suffix}>%</Text>
        </View>
      </View>

      {/* Note */}
      <View style={styles.field}>
        <Text style={shared.label}>Note (optional)</Text>
        <TextInput
          style={[shared.input, { height: 44 }]}
          value={note}
          onChangeText={setNote}
          maxLength={200}
          placeholder="Reason for discount…"
          placeholderTextColor={colors.inkLight}
        />
      </View>

      <TouchableOpacity
        style={[shared.btnPrimary, { opacity: saving ? 0.6 : 1 }]}
        onPress={handleSubmit}
        disabled={saving}
      >
        <Text style={shared.btnPrimaryText}>{saving ? "Creating…" : "+ Create Discount"}</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DiscountsScreen({ role = "Staff" }) {
  const isAdmin = role === "Admin" || role === "ADMIN" || role === "OWNER";

  const [products, setProducts]       = useState([]);
  const [discounts, setDiscounts]     = useState([]);
  const [inventory, setInventory]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [savingId, setSavingId]       = useState(null);
  const [applyingId, setApplyingId]   = useState(null);
  const [togglingId, setTogglingId]   = useState(null);
  const [creatingDiscount, setCreating] = useState(false);

  const [error, setError]             = useState("");
  const [successMsg, setSuccessMsg]   = useState("");

  const [editingId, setEditingId]     = useState(null);
  const [filterActive, setFilterActive] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate]   = useState(false);

  const [discardedIds, setDiscardedIds] = useState([]);

  // Load discarded IDs from storage
  useEffect(() => {
    AsyncStorage.getItem("ai_discarded_suggestions").then((val) => {
      if (val) try { setDiscardedIds(JSON.parse(val)); } catch { }
    });
  }, []);

  const saveDiscarded = (ids) => {
    setDiscardedIds(ids);
    AsyncStorage.setItem("ai_discarded_suggestions", JSON.stringify(ids));
  };

  const flash = useCallback((msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  }, []);

  // ── Load all data ───────────────────────────────────────────────────────────
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const [prodRes, discRes, invRes] = await Promise.all([
        productApi.getAll(),
        discountApi.getAll(),
        inventoryApi.getAll(),
      ]);

      if (prodRes.ok) {
        const d = await prodRes.json();
        setProducts((Array.isArray(d) ? d : []).map((p) => ({
          ...p, id: p.id ?? p.productId, name: p.name ?? p.productName,
        })));
      }
      if (discRes.ok) { const d = await discRes.json(); setDiscounts(Array.isArray(d) ? d : []); }
      if (invRes.ok)  { const d = await invRes.json();  setInventory(Array.isArray(d) ? d : []); }
    } catch (e) {
      setError("Failed to load data. Check connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = discounts.length;
    const active = discounts.filter((d) => d.active).length;
    const aiCount = discounts.filter((d) => d.source === "AI").length;
    const avgPct = total === 0 ? 0 : Math.round(discounts.reduce((s, d) => s + d.discountPercent, 0) / total);
    return { total, active, inactive: total - active, aiCount, avgPct };
  }, [discounts]);

  const discountedBatchIds = useMemo(() => new Set(discounts.map((d) => d.batchId).filter(Boolean)), [discounts]);

  const aiSuggestions = useMemo(() =>
    inventory.filter((x) =>
      x.riskLevel === "HIGH" && x.suggestedDiscount > 0 &&
      !discardedIds.includes(x.id) && !discountedBatchIds.has(x.id)
    ).sort((a, b) => b.suggestedDiscount - a.suggestedDiscount),
  [inventory, discardedIds, discountedBatchIds]);

  const filteredDiscounts = useMemo(() => {
    let list = [...discounts];
    if (filterActive === "active")   list = list.filter((d) => d.active);
    if (filterActive === "inactive") list = list.filter((d) => !d.active);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((d) =>
        (d.productName || "").toLowerCase().includes(q) ||
        (d.batchNumber || "").toLowerCase().includes(q) ||
        (d.note || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [discounts, filterActive, searchQuery]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleCreate = async (body) => {
    try {
      setCreating(true);
      const res = await discountApi.create(body);
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Create failed"); return; }
      setDiscounts((prev) => [data, ...prev]);
      setShowCreate(false);
      flash("Discount created!");
    } catch { setError("Network error"); }
    finally { setCreating(false); }
  };

  const handleSaveEdit = async (discount, updates) => {
    try {
      setSavingId(discount.id);
      const res = await discountApi.update(discount.id, updates);
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Update failed"); return; }
      setDiscounts((prev) => prev.map((d) => (d.id === discount.id ? data : d)));
      setEditingId(null);
      flash("Discount updated!");
    } catch { setError("Network error"); }
    finally { setSavingId(null); }
  };

  const handleToggle = async (discount) => {
    try {
      setTogglingId(discount.id);
      const res = await discountApi.toggleActive(discount.id);
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Toggle failed"); return; }
      setDiscounts((prev) => prev.map((d) => (d.id === discount.id ? data : d)));
    } catch { setError("Network error"); }
    finally { setTogglingId(null); }
  };

  const handleDelete = (id) => {
    Alert.alert("Delete Discount", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            const res = await discountApi.delete(id);
            if (!res.ok) { const d = await res.json(); setError(d.message); return; }
            setDiscounts((prev) => prev.filter((d) => d.id !== id));
            flash("Discount deleted.");
          } catch { setError("Network error"); }
        },
      },
    ]);
  };

  const handleApplySuggestion = async (item) => {
    try {
      setApplyingId(item.id);
      const pct = Math.round(item.suggestedDiscount);
      const res = await discountApi.create({
        productId: item.productId, productName: item.productName,
        batchId: item.id, batchNumber: item.batchNumber,
        discountPercent: pct, source: "AI",
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Apply failed"); return; }
      setDiscounts((prev) => [data, ...prev]);
      flash(`AI suggestion applied — ${pct}% off!`);
    } catch { setError("Network error"); }
    finally { setApplyingId(null); }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={shared.screen}
      contentContainerStyle={shared.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.primary} />}
    >
      <View style={{ padding: 16 }}>

        {/* Header */}
        <View style={{ marginBottom: 20 }}>
          <Text style={shared.pageTitle}>Discounts</Text>
          <Text style={shared.pageSubtitle}>Manage product & batch discounts</Text>
        </View>

        {/* Banners */}
        <Banner type="error"   message={error}      onClose={() => setError("")} />
        <Banner type="success" message={successMsg} onClose={() => setSuccessMsg("")} />

        {loading ? (
          <Spinner label="Loading discounts…" />
        ) : (
          <>
            {/* Stats row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={[shared.row, { gap: 10, paddingRight: 16 }]}>
                <StatCard label="Total"    value={stats.total}    accent={colors.ink} />
                <StatCard label="Active"   value={stats.active}   accent={colors.primary} />
                <StatCard label="Inactive" value={stats.inactive} accent="#94A3B8" />
                <StatCard label="AI"       value={stats.aiCount}  accent={colors.purple} />
                <StatCard label="Avg %"    value={`${stats.avgPct}%`} accent="#F59E0B" />
              </View>
            </ScrollView>

            {/* AI Suggestions */}
            {aiSuggestions.length > 0 && (
              <View style={[shared.card, { borderLeftWidth: 4, borderLeftColor: colors.purple, marginBottom: 16 }]}>
                <View style={[shared.rowBetween, { marginBottom: 10 }]}>
                  <Text style={shared.sectionTitle}>AI Suggestions</Text>
                  <View style={[shared.pill, { backgroundColor: colors.purple }]}>
                    <Text style={[shared.pillText, { color: "#fff" }]}>AI · {aiSuggestions.length}</Text>
                  </View>
                </View>
                {aiSuggestions.map((item) => {
                  const days = daysLeft(item.expiryDate);
                  const busy = applyingId === item.id;
                  return (
                    <View key={item.id} style={[styles.listItem, { borderLeftWidth: 3, borderLeftColor: colors.critical }]}>
                      <Text style={shared.bodyBold}>{item.productName}</Text>
                      <Text style={shared.bodyMuted}>
                        Batch: {item.batchNumber} · Qty: {item.quantity}
                        {days !== null ? ` · ${days}d left` : ""}
                      </Text>
                      <Text style={[shared.bodyMuted, { marginTop: 2 }]}>
                        Rs.{item.sellingPrice?.toFixed(2)} · Cost: Rs.{item.costPrice?.toFixed(2)}
                      </Text>
                      <View style={[shared.row, { gap: 8, marginTop: 10 }]}>
                        <View style={[shared.pill, { backgroundColor: "#FEE2E2" }]}>
                          <Text style={[shared.pillText, { color: colors.critical }]}>HIGH RISK</Text>
                        </View>
                        <View style={[shared.pill, { backgroundColor: colors.successBg }]}>
                          <Text style={[shared.pillText, { color: colors.success }]}>{item.suggestedDiscount?.toFixed(1)}% OFF</Text>
                        </View>
                      </View>
                      <View style={[shared.row, { gap: 8, marginTop: 10 }]}>
                        <TouchableOpacity
                          style={[shared.btnPrimary, { flex: 1, opacity: busy ? 0.6 : 1 }]}
                          onPress={() => handleApplySuggestion(item)}
                          disabled={busy}
                        >
                          <Text style={shared.btnPrimaryText}>{busy ? "Applying…" : "✓ Apply"}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={shared.btnGhost}
                          onPress={() => saveDiscarded([...discardedIds, item.id])}
                          disabled={busy}
                        >
                          <Text style={shared.btnGhostText}>✕ Discard</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Create Discount */}
            {isAdmin && (
              <View style={shared.card}>
                <TouchableOpacity
                  style={shared.rowBetween}
                  onPress={() => setShowCreate((v) => !v)}
                >
                  <SectionHeader title="New Discount" subtitle="Apply a discount to a batch" />
                  <Text style={{ fontSize: 22, color: colors.primary }}>{showCreate ? "−" : "+"}</Text>
                </TouchableOpacity>
                {showCreate && (
                  <CreateForm
                    products={products}
                    onSubmit={handleCreate}
                    saving={creatingDiscount}
                  />
                )}
              </View>
            )}

            {/* Discounts list */}
            <View style={shared.card}>
              <View style={[shared.rowBetween, { marginBottom: 12 }]}>
                <SectionHeader
                  title="All Discounts"
                  subtitle={`${filteredDiscounts.length} of ${discounts.length}`}
                />
              </View>

              {/* Search + filter */}
              <TextInput
                style={[shared.input, { marginBottom: 10, height: 40 }]}
                placeholder="Search product, batch, note…"
                placeholderTextColor={colors.inkLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <FilterTabs
                options={[
                  { label: "All", value: "all" },
                  { label: "Active", value: "active" },
                  { label: "Inactive", value: "inactive" },
                ]}
                active={filterActive}
                onSelect={setFilterActive}
              />

              <View style={{ height: 14 }} />

              {filteredDiscounts.length === 0 ? (
                <EmptyState icon="🏷️" text={discounts.length === 0 ? "No discounts yet." : "No discounts match your filter."} />
              ) : (
                filteredDiscounts.map((d) => {
                  const isEditing  = editingId === d.id;
                  const isSaving   = savingId === d.id;
                  const isToggling = togglingId === d.id;

                  return (
                    <View
                      key={d.id}
                      style={[
                        styles.listItem,
                        !d.active && { opacity: 0.6 },
                        isEditing && { borderColor: colors.primary, borderWidth: 1.5 },
                      ]}
                    >
                      <View style={shared.rowBetween}>
                        <View style={{ flex: 1 }}>
                          <View style={[shared.row, { flexWrap: "wrap", gap: 6 }]}>
                            <Text style={shared.bodyBold}>
                              {d.productName || `Product #${d.productId}`}
                            </Text>
                            <View style={[shared.pill, { backgroundColor: colors.inkFaint }]}>
                              <Text style={[shared.pillText, { color: colors.inkLight }]}>
                                Batch: {d.batchNumber || `#${d.batchId}`}
                              </Text>
                            </View>
                            {d.source === "AI" && (
                              <View style={[shared.pill, { backgroundColor: colors.purpleBg }]}>
                                <Text style={[shared.pillText, { color: colors.purple }]}>AI</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[shared.bodyMuted, { marginTop: 4 }]}>
                            {d.note || "No note"}
                            {d.expiryDate ? `  ·  Exp: ${d.expiryDate}` : ""}
                          </Text>
                        </View>

                        {/* Right: badge + toggle */}
                        <View style={{ alignItems: "flex-end", gap: 6, marginLeft: 10 }}>
                          <View style={[shared.pill, { backgroundColor: colors.purpleBg }]}>
                            <Text style={[shared.pillText, { color: colors.purple }]}>{d.discountPercent}% OFF</Text>
                          </View>
                          <ToggleSwitch
                            checked={d.active}
                            onToggle={() => handleToggle(d)}
                            disabled={!isAdmin || isToggling}
                          />
                        </View>
                      </View>

                      {/* Admin edit/delete */}
                      {isAdmin && !isEditing && (
                        <View style={[shared.row, { gap: 8, marginTop: 10 }]}>
                          <TouchableOpacity
                            style={shared.btnOutline}
                            onPress={() => setEditingId(d.id)}
                          >
                            <Text style={shared.btnOutlineText}>✎ Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={shared.btnDanger}
                            onPress={() => handleDelete(d.id)}
                          >
                            <Text style={shared.btnDangerText}>✕ Delete</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {isEditing && (
                        <EditBox
                          discount={d}
                          saving={isSaving}
                          onSave={(updates) => handleSaveEdit(d, updates)}
                          onCancel={() => setEditingId(null)}
                        />
                      )}
                    </View>
                  );
                })
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
  listItem: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderInk,
  },
  field:       { marginBottom: 14 },
  editBox:     { marginTop: 14, padding: 14, backgroundColor: colors.inkFaint, borderRadius: 16, gap: 12 },
  editRow:     { gap: 6 },
  suffixRow:   { flexDirection: "row", alignItems: "center", gap: 6 },
  suffix:      { fontSize: 14, fontWeight: "900", color: colors.inkLight },
  previewRow:  { backgroundColor: "rgba(0,122,94,0.07)", borderRadius: 14, padding: 14, marginBottom: 14, flexDirection: "row", alignItems: "center" },
  chipBtn:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.inkFaint, marginRight: 8 },
  chipActive:  { backgroundColor: colors.primary },
  chipText:    { fontSize: 12, fontWeight: "700", color: colors.ink },
  chipActiveText: { color: "#fff" },
});
