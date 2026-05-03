import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Print          from 'expo-print';
import * as Sharing        from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking        from 'expo-linking';
import {
  createReport,
  deleteReport,
  getReportAttachmentUrl,
  getReports,
  getReportsOverview,
  getSalesDashboardSummary,
  removeReportAttachment,
  updateReport,
  uploadReportAttachment,
} from '../../api';
import Card         from '../../components/Card';
import Screen       from '../../components/Screen';
import WorkspaceHeader from '../../components/WorkspaceHeader';
import { colors }   from '../../theme';
import { formatMoney, getDashboardRangeParams } from '../../sales/utils';

// ── Constants ─────────────────────────────────────────────────────────────────
const REPORT_TYPES = [
  { value: 'SALES',          label: 'Sales Report',   icon: 'cash-outline',        color: '#10B981' },
  { value: 'INVENTORY',      label: 'Inventory',      icon: 'archive-outline',     color: '#7C3AED' },
  { value: 'EXPIRED',        label: 'Expired Stock',  icon: 'skull-outline',       color: '#DC2626' },
  { value: 'NEAR_EXPIRY',    label: 'Near Expiry',    icon: 'time-outline',        color: '#D97706' },
  { value: 'LOW_STOCK',      label: 'Low Stock',      icon: 'warning-outline',     color: '#F59E0B' },
  { value: 'DISCOUNT_USAGE', label: 'Discount Usage', icon: 'pricetag-outline',    color: '#EC4899' },
];
const TYPE_META = Object.fromEntries(REPORT_TYPES.map((t) => [t.value, t]));

const VISIBILITY_OPTIONS = [
  { value: 'ADMIN', label: 'Admin Only' },
  { value: 'ALL',   label: 'All Staff'  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── PDF builder ───────────────────────────────────────────────────────────────
function buildReportHtml(item) {
  const meta = TYPE_META[item.reportType] || { label: item.reportType, color: '#333' };
  const s    = item.summary || {};

  let bodyHtml = '';

  if (item.reportType === 'SALES') {
    const rows = (s.topProducts || []).map((p) =>
      `<tr><td>${p.name}</td><td>${p.qty}</td><td>${formatMoney(p.revenue)}</td></tr>`
    ).join('');
    bodyHtml = `
      <table><tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Total Revenue</td><td>${formatMoney(s.totalRevenue || 0)}</td></tr>
        <tr><td>Total Sales</td><td>${s.totalSales || 0}</td></tr>
        <tr><td>Voided Sales</td><td>${s.voidedSales || 0}</td></tr>
        <tr><td>Avg Sale Value</td><td>${formatMoney(s.avgSaleValue || 0)}</td></tr>
      </table>
      ${rows ? `<h3>Top Products</h3><table><tr><th>Product</th><th>Qty</th><th>Revenue</th></tr>${rows}</table>` : ''}`;
  } else if (item.reportType === 'INVENTORY') {
    bodyHtml = `
      <table><tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Total Batches</td><td>${s.totalBatches || 0}</td></tr>
        <tr><td>Total Quantity</td><td>${s.totalQuantity || 0}</td></tr>
        <tr><td>Estimated Stock Value</td><td>${formatMoney(s.estimatedValue || 0)}</td></tr>
      </table>`;
  } else if (['EXPIRED', 'NEAR_EXPIRY', 'LOW_STOCK'].includes(item.reportType)) {
    const label = item.reportType === 'NEAR_EXPIRY' ? 'Days Left' : 'Qty On Hand';
    const rows  = (s.items || []).map((b) =>
      `<tr><td>${b.productName}</td><td>${b.batchNumber || '—'}</td><td>${b.daysLeft != null ? b.daysLeft + 'd' : (b.quantityOnHand ?? '—')}</td></tr>`
    ).join('');
    bodyHtml = `
      <p><strong>Flagged batches: ${s.count || 0}</strong></p>
      ${rows ? `<table><tr><th>Product</th><th>Batch</th><th>${label}</th></tr>${rows}</table>` : '<p>No items.</p>'}`;
  } else if (item.reportType === 'DISCOUNT_USAGE') {
    bodyHtml = `
      <table><tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Active Discounts</td><td>${s.activeDiscounts || 0}</td></tr>
        <tr><td>Discounted Items Sold</td><td>${s.discountedItems || 0}</td></tr>
        <tr><td>Total Customer Savings</td><td>${formatMoney(s.totalSavings || 0)}</td></tr>
      </table>`;
  }

  return `
    <!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <style>
      body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
      h1   { font-size: 22px; margin-bottom: 4px; }
      .sub { color: #64748b; font-size: 13px; margin-bottom: 24px; }
      .badge { display:inline-block; background:${meta.color}22; color:${meta.color};
               padding:3px 10px; border-radius:6px; font-size:12px; font-weight:700; margin-bottom:20px; }
      table { width:100%; border-collapse:collapse; margin-top:12px; }
      th,td { border:1px solid #e2e8f0; padding:8px 12px; font-size:13px; text-align:left; }
      th    { background:#f8fafc; font-weight:700; }
      h3    { margin-top:24px; font-size:15px; }
      .footer { margin-top:40px; color:#94a3b8; font-size:11px; border-top:1px solid #e2e8f0; padding-top:12px; }
    </style></head><body>
    <h1>${item.reportTitle}</h1>
    <p class="sub">Generated on ${fmtDate(item.createdAt)} by ${item.createdByName || 'Admin'}</p>
    <span class="badge">${meta.label}</span>
    ${bodyHtml}
    <div class="footer">Invigo — Freshguard Inventory System · Report snapshot generated at time of creation.</div>
    </body></html>`;
}

async function exportReportPdf(item) {
  try {
    const html = buildReportHtml(item);
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${item.reportTitle}.pdf` });
    } else {
      Alert.alert('Saved', `PDF saved to: ${uri}`);
    }
  } catch (e) {
    Alert.alert('Export failed', e.message || 'Could not generate PDF.');
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatTile({ icon, label, value, color, sub }) {
  return (
    <View style={[styles.statTile, { borderTopColor: color }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {!!sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

function SalesBlock({ title, data }) {
  if (!data) return null;
  return (
    <View style={styles.salesBlock}>
      <Text style={styles.salesBlockTitle}>{title}</Text>
      <Text style={styles.salesBlockRevenue}>{formatMoney(data.todaysRevenue ?? 0)}</Text>
      <Text style={styles.salesBlockMeta}>{data.todaysActiveBills ?? 0} active · {data.voidedSalesCount ?? 0} voided</Text>
    </View>
  );
}

function SummarySnippet({ type, summary }) {
  if (!summary) return null;
  if (type === 'SALES') return (
    <View style={styles.snippetRow}>
      <Text style={styles.snippetItem}>Revenue: <Text style={styles.snippetBold}>{formatMoney(summary.totalRevenue || 0)}</Text></Text>
      <Text style={styles.snippetItem}>Sales: <Text style={styles.snippetBold}>{summary.totalSales || 0}</Text></Text>
      {summary.topProducts?.length > 0 && (
        <Text style={styles.snippetItem} numberOfLines={1}>Top: <Text style={styles.snippetBold}>{summary.topProducts[0].name}</Text></Text>
      )}
    </View>
  );
  if (type === 'INVENTORY') return (
    <View style={styles.snippetRow}>
      <Text style={styles.snippetItem}>Batches: <Text style={styles.snippetBold}>{summary.totalBatches || 0}</Text></Text>
      <Text style={styles.snippetItem}>Qty: <Text style={styles.snippetBold}>{summary.totalQuantity || 0}</Text></Text>
      <Text style={styles.snippetItem}>Est. Value: <Text style={styles.snippetBold}>{formatMoney(summary.estimatedValue || 0)}</Text></Text>
    </View>
  );
  if (['EXPIRED', 'NEAR_EXPIRY', 'LOW_STOCK'].includes(type)) return (
    <View style={styles.snippetRow}>
      <Text style={styles.snippetItem}>Flagged: <Text style={styles.snippetBold}>{summary.count || 0} batches</Text></Text>
      {(summary.items || []).slice(0, 2).map((item, i) => (
        <Text key={i} style={styles.snippetItem} numberOfLines={1}>
          · {item.productName}{item.daysLeft != null ? ` (${item.daysLeft}d)` : item.quantityOnHand != null ? ` (qty ${item.quantityOnHand})` : ''}
        </Text>
      ))}
    </View>
  );
  if (type === 'DISCOUNT_USAGE') return (
    <View style={styles.snippetRow}>
      <Text style={styles.snippetItem}>Active discounts: <Text style={styles.snippetBold}>{summary.activeDiscounts || 0}</Text></Text>
      <Text style={styles.snippetItem}>Items w/ discount: <Text style={styles.snippetBold}>{summary.discountedItems || 0}</Text></Text>
      <Text style={styles.snippetItem}>Savings: <Text style={styles.snippetBold}>{formatMoney(summary.totalSavings || 0)}</Text></Text>
    </View>
  );
  return null;
}

function ReportCard({ item, isAdmin, onEdit, onDelete, onExport, onAttach, onRemoveAttachment }) {
  const meta        = TYPE_META[item.reportType] || { icon: 'document-outline', color: colors.slate, label: item.reportType };
  const isAdminOnly = item.visibility === 'ADMIN';
  const hasAttachment = !!item.attachmentFileId;
  const attachUrl     = hasAttachment ? getReportAttachmentUrl(item.id, item.attachmentUpdatedAt) : null;

  return (
    <View style={[styles.reportCard, { borderLeftColor: meta.color }]}>
      <View style={styles.reportCardTop}>
        <View style={[styles.reportTypeIcon, { backgroundColor: `${meta.color}18` }]}>
          <Ionicons name={meta.icon} size={18} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportTitle} numberOfLines={1}>{item.reportTitle}</Text>
          <View style={styles.reportMetaRow}>
            <View style={[styles.typeBadge, { backgroundColor: `${meta.color}18` }]}>
              <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <View style={[styles.visBadge, { backgroundColor: isAdminOnly ? '#FEF2F2' : '#F0FDF4' }]}>
              <Text style={[styles.visBadgeText, { color: isAdminOnly ? '#DC2626' : '#16A34A' }]}>
                {isAdminOnly ? 'Admin Only' : 'All Staff'}
              </Text>
            </View>
            {hasAttachment && (
              <View style={styles.attachBadge}>
                <Ionicons name="attach-outline" size={11} color="#7C3AED" />
                <Text style={styles.attachBadgeText} numberOfLines={1}>
                  {item.attachmentOriginalName || 'Attached'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <SummarySnippet type={item.reportType} summary={item.summary} />

      <Text style={styles.reportFooter}>
        By {item.createdByName || 'Admin'} · {fmtDate(item.createdAt)}
      </Text>

      {/* Action row */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.cardActionBtn} onPress={onExport}>
          <Ionicons name="document-text-outline" size={14} color={colors.purple} />
          <Text style={[styles.cardActionText, { color: colors.purple }]}>Export PDF</Text>
        </TouchableOpacity>

        {hasAttachment && (
          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={() => Linking.openURL(attachUrl).catch(() => Alert.alert('Error', 'Could not open attachment.'))}
          >
            <Ionicons name="eye-outline" size={14} color="#7C3AED" />
            <Text style={[styles.cardActionText, { color: '#7C3AED' }]}>View File</Text>
          </TouchableOpacity>
        )}

        {isAdmin && (
          <>
            <TouchableOpacity style={styles.cardActionBtn} onPress={onAttach}>
              <Ionicons name="attach-outline" size={14} color={colors.emerald} />
              <Text style={[styles.cardActionText, { color: colors.emerald }]}>
                {hasAttachment ? 'Replace File' : 'Attach File'}
              </Text>
            </TouchableOpacity>
            {hasAttachment && (
              <TouchableOpacity style={styles.cardActionBtn} onPress={onRemoveAttachment}>
                <Ionicons name="close-circle-outline" size={14} color={colors.danger} />
                <Text style={[styles.cardActionText, { color: colors.danger }]}>Remove File</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cardActionBtn} onPress={onEdit}>
              <Ionicons name="pencil-outline" size={14} color={colors.slate} />
              <Text style={styles.cardActionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cardActionBtn} onPress={onDelete}>
              <Ionicons name="trash-outline" size={14} color={colors.danger} />
              <Text style={[styles.cardActionText, { color: colors.danger }]}>Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

// ── Shared form fields ─────────────────────────────────────────────────────────
function TitleField({ value, onChange }) {
  return (
    <TextInput
      style={styles.nativeInput}
      placeholder="e.g. Monthly Sales — May 2026"
      placeholderTextColor="rgba(15,23,42,0.35)"
      value={value}
      onChangeText={onChange}
      maxLength={200}
    />
  );
}

function VisibilityField({ value, onChange }) {
  return (
    <View style={styles.visRow}>
      {VISIBILITY_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={[styles.visChip, active && styles.visChipActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.visChipText, active && styles.visChipTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Generate Modal ─────────────────────────────────────────────────────────────
function GenerateModal({ visible, onClose, onGenerate, loading }) {
  const [title,      setTitle]      = useState('');
  const [reportType, setReportType] = useState('');
  const [visibility, setVisibility] = useState('ADMIN');

  function handleClose() { setTitle(''); setReportType(''); setVisibility('ADMIN'); onClose(); }

  function handleSubmit() {
    if (!title.trim()) return Alert.alert('Required', 'Please enter a report title.');
    if (!reportType)   return Alert.alert('Required', 'Please select a report type.');
    onGenerate({ reportTitle: title.trim(), reportType, visibility });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.modalBackdrop} onPress={handleClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalHeading}>Generate Report</Text>
        <Text style={styles.modalSub}>A data snapshot will be computed and saved from live records.</Text>

        <Text style={styles.fieldLabel}>Report Title</Text>
        <TitleField value={title} onChange={setTitle} />

        <Text style={styles.fieldLabel}>Report Type</Text>
        <View style={styles.typeGrid}>
          {REPORT_TYPES.map((rt) => {
            const active = reportType === rt.value;
            return (
              <Pressable
                key={rt.value}
                style={[styles.typeChip, active && { backgroundColor: rt.color, borderColor: rt.color }]}
                onPress={() => setReportType(rt.value)}
              >
                <Ionicons name={rt.icon} size={14} color={active ? '#fff' : rt.color} />
                <Text style={[styles.typeChipText, active && { color: '#fff' }]}>{rt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Visibility</Text>
        <VisibilityField value={visibility} onChange={setVisibility} />

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.generateBtn, loading && { opacity: 0.6 }]}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Ionicons name="flash-outline" size={16} color="#fff" /><Text style={styles.generateBtnText}>Generate</Text></>
          }
        </Pressable>
      </View>
    </Modal>
  );
}

// ── Edit Modal ─────────────────────────────────────────────────────────────────
function EditModal({ visible, report, onClose, onSave, loading }) {
  const [title,      setTitle]      = useState(report?.reportTitle || '');
  const [visibility, setVisibility] = useState(report?.visibility  || 'ADMIN');

  // sync when report changes
  React.useEffect(() => {
    if (report) { setTitle(report.reportTitle || ''); setVisibility(report.visibility || 'ADMIN'); }
  }, [report?.id]);

  function handleSubmit() {
    if (!title.trim()) return Alert.alert('Required', 'Title cannot be empty.');
    onSave({ reportTitle: title.trim(), visibility });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalHeading}>Edit Report</Text>
        <Text style={styles.modalSub}>Update the title or visibility. Data snapshot stays the same.</Text>

        <Text style={styles.fieldLabel}>Report Title</Text>
        <TitleField value={title} onChange={setTitle} />

        <Text style={styles.fieldLabel}>Visibility</Text>
        <VisibilityField value={visibility} onChange={setVisibility} />

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.generateBtn, loading && { opacity: 0.6 }]}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Ionicons name="checkmark-outline" size={16} color="#fff" /><Text style={styles.generateBtnText}>Save Changes</Text></>
          }
        </Pressable>
      </View>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function SalesReportsScreen({ go, sessionUser, onLogout, onOpenHistory, onOpenPos }) {
  const isAdmin = String(sessionUser?.role || '').toUpperCase() === 'ADMIN';

  const [salesData,   setSalesData]   = useState({ today: null, week: null, month: null });
  const [overview,    setOverview]    = useState(null);
  const [reports,     setReports]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [genLoading,     setGenLoading]     = useState(false);
  const [editLoading,    setEditLoading]    = useState(false);
  const [attachLoading,  setAttachLoading]  = useState(false);
  const [genOpen,        setGenOpen]        = useState(false);
  const [editReport,     setEditReport]     = useState(null); // report being edited
  const [activeTab,   setActiveTab]   = useState('dashboard');
  const [visFilter,   setVisFilter]   = useState('ALL_VIS');
  const [error,       setError]       = useState('');

  const loadAll = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError('');
    try {
      const [today, week, month, ov, reps] = await Promise.all([
        getSalesDashboardSummary(getDashboardRangeParams('TODAY')).catch(() => null),
        getSalesDashboardSummary(getDashboardRangeParams('THIS_WEEK')).catch(() => null),
        getSalesDashboardSummary(getDashboardRangeParams('THIS_MONTH')).catch(() => null),
        getReportsOverview().catch(() => ({})),
        getReports().catch(() => []),
      ]);
      setSalesData({ today, week, month });
      setOverview(ov);
      setReports(reps);
    } catch (e) {
      setError(e.message || 'Could not load report data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  // ── Generate ──────────────────────────────────────────────────────────────
  async function handleGenerate(payload) {
    setGenLoading(true);
    try {
      const created = await createReport(payload);
      setReports((prev) => [created, ...prev]);
      setGenOpen(false);
      setActiveTab('reports');
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not generate report.');
    } finally {
      setGenLoading(false);
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────
  async function handleEdit(payload) {
    if (!editReport) return;
    setEditLoading(true);
    try {
      const updated = await updateReport(editReport.id, payload);
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setEditReport(null);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not update report.');
    } finally {
      setEditLoading(false);
    }
  }

  // ── Attach file ───────────────────────────────────────────────────────────
  async function handleAttach(reportId) {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf',
               'application/msword',
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
               'application/vnd.ms-excel',
               'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
               'text/csv'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      setAttachLoading(true);
      const updated = await uploadReportAttachment(reportId, {
        uri:      file.uri,
        name:     file.name,
        mimeType: file.mimeType,
      });
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (e) {
      Alert.alert('Upload failed', e.message || 'Could not attach file.');
    } finally {
      setAttachLoading(false);
    }
  }

  async function handleRemoveAttachment(reportId) {
    Alert.alert('Remove Attachment', 'Remove the attached file from this report?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await removeReportAttachment(reportId);
            // Clear attachment fields locally
            setReports((prev) => prev.map((r) =>
              r.id === reportId
                ? { ...r, attachmentFileId: null, attachmentOriginalName: '', attachmentUpdatedAt: null }
                : r
            ));
          } catch (e) {
            Alert.alert('Error', e.message || 'Could not remove attachment.');
          }
        },
      },
    ]);
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  function handleDelete(id) {
    Alert.alert('Delete Report', 'Permanently remove this report snapshot?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteReport(id);
            setReports((prev) => prev.filter((r) => r.id !== id));
          } catch (e) {
            Alert.alert('Error', e.message || 'Delete failed.');
          }
        },
      },
    ]);
  }

  const filteredReports = useMemo(() => {
    if (visFilter === 'ALL_VIS') return reports;
    return reports.filter((r) => r.visibility === visFilter);
  }, [reports, visFilter]);

  return (
    <Screen scroll={false} style={{ paddingBottom: 0 }}>
      <WorkspaceHeader
        pillLabel="Reports"
        pillIcon="bar-chart-outline"
        pillColor={colors.purple}
        onLogout={onLogout}
        go={go}
        role={sessionUser?.role}
        sessionUser={sessionUser}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={() => { setRefreshing(true); loadAll(true); }} />}
      >
        {/* Page header */}
        <View style={styles.pageHeader}>
          <Text style={[styles.kicker, { color: colors.purple }]}>Analytics</Text>
          <Text style={styles.pageTitle}>Reports &amp; Insights</Text>
          <Text style={styles.pageSub}>Live sales stats, inventory health, and generated report snapshots.</Text>
        </View>

        {!!error && <Text style={styles.errorBanner}>{error}</Text>}

        {/* Overview tiles */}
        {overview && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
            <View style={styles.tilesRow}>
              <StatTile icon="cart-outline"          label="All Sales"  value={overview.totalSalesCount ?? '—'} color={colors.emerald} sub={`${overview.todaySalesCount ?? 0} today`} />
              <StatTile icon="skull-outline"         label="Expired"    value={overview.expiredBatches  ?? '—'} color="#DC2626" />
              <StatTile icon="warning-outline"       label="Low Stock"  value={overview.lowStockBatches ?? '—'} color="#D97706" />
              <StatTile icon="pricetag-outline"      label="Discounts"  value={overview.activeDiscounts ?? '—'} color={colors.purple} />
              <StatTile icon="document-text-outline" label="Reports"    value={overview.totalReports    ?? '—'} color={colors.slate} />
            </View>
          </ScrollView>
        )}

        {/* Tab switcher */}
        <View style={styles.tabRow}>
          {[
            { key: 'dashboard', label: 'Sales Dashboard', icon: 'stats-chart-outline' },
            { key: 'reports',   label: 'Report Library',  icon: 'folder-open-outline' },
          ].map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon} size={15} color={activeTab === tab.key ? '#fff' : 'rgba(15,23,42,0.5)'} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Dashboard tab ────────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <Card>
            <Text style={styles.sectionTitle}>Sales Performance</Text>
            <Text style={styles.sectionSub}>Revenue pulled live from the sales records.</Text>
            {loading ? (
              <View style={styles.loadingWrap}><ActivityIndicator color={colors.purple} /></View>
            ) : (
              <>
                <View style={styles.salesGrid}>
                  <SalesBlock title="Today"     data={salesData.today} />
                  <SalesBlock title="This Week"  data={salesData.week}  />
                  <SalesBlock title="This Month" data={salesData.month} />
                </View>
                <View style={styles.divider} />
                <Text style={[styles.sectionTitle, { marginTop: 4 }]}>Quick Actions</Text>
                <View style={styles.actionRow}>
                  {onOpenPos && (
                    <Pressable style={styles.actionBtn} onPress={onOpenPos}>
                      <Ionicons name="cart-outline" size={17} color={colors.emerald} />
                      <Text style={styles.actionBtnText}>Open POS</Text>
                    </Pressable>
                  )}
                  {onOpenHistory && (
                    <Pressable style={styles.actionBtn} onPress={onOpenHistory}>
                      <Ionicons name="receipt-outline" size={17} color={colors.purple} />
                      <Text style={styles.actionBtnText}>Sales History</Text>
                    </Pressable>
                  )}
                  {isAdmin && (
                    <Pressable style={styles.actionBtn} onPress={() => setGenOpen(true)}>
                      <Ionicons name="flash-outline" size={17} color={colors.magenta} />
                      <Text style={styles.actionBtnText}>New Report</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </Card>
        )}

        {/* ── Reports tab ──────────────────────────────────────���───────── */}
        {activeTab === 'reports' && (
          <Card>
            <View style={styles.reportsHeader}>
              <View>
                <Text style={styles.sectionTitle}>Report Library</Text>
                <Text style={styles.sectionSub}>{filteredReports.length} snapshot{filteredReports.length !== 1 ? 's' : ''}</Text>
              </View>
              {isAdmin && (
                <Pressable style={styles.genBtn} onPress={() => setGenOpen(true)}>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.genBtnText}>Generate</Text>
                </Pressable>
              )}
            </View>

            {isAdmin && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={styles.filterRow}>
                  {[
                    { key: 'ALL_VIS', label: 'All'        },
                    { key: 'ADMIN',   label: 'Admin Only'  },
                    { key: 'ALL',     label: 'All Staff'   },
                  ].map((f) => (
                    <Pressable
                      key={f.key}
                      style={[styles.filterChip, visFilter === f.key && styles.filterChipActive]}
                      onPress={() => setVisFilter(f.key)}
                    >
                      <Text style={[styles.filterText, visFilter === f.key && styles.filterTextActive]}>{f.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}

            {loading ? (
              <View style={styles.loadingWrap}><ActivityIndicator color={colors.purple} /></View>
            ) : filteredReports.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="document-outline" size={40} color="rgba(15,23,42,0.2)" />
                <Text style={styles.emptyText}>No reports yet.{isAdmin ? '\nTap Generate to create one.' : ''}</Text>
              </View>
            ) : (
              filteredReports.map((item) => (
                <ReportCard
                  key={item.id}
                  item={item}
                  isAdmin={isAdmin}
                  onEdit={()               => setEditReport(item)}
                  onDelete={()             => handleDelete(item.id)}
                  onExport={()             => exportReportPdf(item)}
                  onAttach={()             => handleAttach(item.id)}
                  onRemoveAttachment={()   => handleRemoveAttachment(item.id)}
                />
              ))
            )}
          </Card>
        )}
      </ScrollView>

      {/* ── Modals ── */}
      {isAdmin && (
        <GenerateModal
          visible={genOpen}
          onClose={() => setGenOpen(false)}
          onGenerate={handleGenerate}
          loading={genLoading}
        />
      )}
      {isAdmin && (
        <EditModal
          visible={!!editReport}
          report={editReport}
          onClose={() => setEditReport(null)}
          onSave={handleEdit}
          loading={editLoading}
        />
      )}
    </Screen>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  pageHeader:    { marginTop: 4, marginBottom: 18 },
  kicker:        { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  pageTitle:     { color: colors.slate, fontSize: 31, fontWeight: '900', letterSpacing: -1.2 },
  pageSub:       { color: 'rgba(15,23,42,0.58)', fontWeight: '700', lineHeight: 22, marginTop: 8 },
  errorBanner:   { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', color: '#92400E', padding: 12, borderRadius: 16, fontWeight: '800', marginBottom: 14 },

  tilesRow:      { flexDirection: 'row', gap: 10, paddingRight: 4 },
  statTile:      { backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)', borderRadius: 22, padding: 14, alignItems: 'center', minWidth: 84, borderTopWidth: 3, gap: 4 },
  statValue:     { fontSize: 22, fontWeight: '900', marginTop: 2 },
  statLabel:     { color: 'rgba(15,23,42,0.5)', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' },
  statSub:       { color: 'rgba(15,23,42,0.38)', fontSize: 10, fontWeight: '700' },

  tabRow:        { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tab:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' },
  tabActive:     { backgroundColor: colors.slate, borderColor: colors.slate },
  tabText:       { fontSize: 12, fontWeight: '800', color: 'rgba(15,23,42,0.5)' },
  tabTextActive: { color: '#fff' },

  sectionTitle:  { color: colors.slate, fontWeight: '900', fontSize: 16, marginBottom: 4 },
  sectionSub:    { color: 'rgba(15,23,42,0.45)', fontSize: 12, fontWeight: '700', marginBottom: 16 },
  divider:       { height: 1, backgroundColor: 'rgba(15,23,42,0.07)', marginVertical: 16 },
  loadingWrap:   { alignItems: 'center', paddingVertical: 28 },
  emptyWrap:     { alignItems: 'center', paddingVertical: 36, gap: 10 },
  emptyText:     { color: 'rgba(15,23,42,0.4)', fontWeight: '800', textAlign: 'center', lineHeight: 22 },

  salesGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  salesBlock:        { width: '47%', borderRadius: 18, padding: 14, backgroundColor: 'rgba(124,58,237,0.06)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.1)', gap: 4 },
  salesBlockTitle:   { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8, color: colors.purple },
  salesBlockRevenue: { fontSize: 22, fontWeight: '900', color: colors.slate, marginTop: 4 },
  salesBlockMeta:    { fontSize: 11, color: 'rgba(15,23,42,0.45)', fontWeight: '700' },

  actionRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  actionBtn:     { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' },
  actionBtnText: { fontSize: 13, fontWeight: '800', color: colors.slate },

  reportsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  genBtn:        { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.purple, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14 },
  genBtnText:    { color: '#fff', fontWeight: '900', fontSize: 13 },
  filterRow:     { flexDirection: 'row', gap: 8 },
  filterChip:    { paddingHorizontal: 14, height: 34, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(15,23,42,0.1)', backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { backgroundColor: colors.slate, borderColor: colors.slate },
  filterText:    { color: 'rgba(15,23,42,0.55)', fontWeight: '800', fontSize: 12 },
  filterTextActive: { color: '#fff' },

  // Report card
  reportCard:      { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 18, padding: 14, marginBottom: 10, borderLeftWidth: 3 },
  reportCardTop:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  reportTypeIcon:  { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  reportTitle:     { color: colors.slate, fontWeight: '900', fontSize: 14, marginBottom: 6 },
  reportMetaRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeBadge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeBadgeText:   { fontSize: 10, fontWeight: '900' },
  visBadge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  visBadgeText:    { fontSize: 10, fontWeight: '900' },
  attachBadge:     { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: '#F5F3FF', maxWidth: 160 },
  attachBadgeText: { fontSize: 10, fontWeight: '800', color: '#7C3AED', flexShrink: 1 },
  reportFooter:    { color: 'rgba(15,23,42,0.38)', fontSize: 11, fontWeight: '700', marginTop: 8 },
  cardActions:     { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  cardActionBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' },
  cardActionText:  { fontSize: 12, fontWeight: '800', color: colors.slate },

  snippetRow:    { gap: 3, marginBottom: 2 },
  snippetItem:   { color: 'rgba(15,23,42,0.5)', fontSize: 12, fontWeight: '700' },
  snippetBold:   { color: colors.slate, fontWeight: '900' },

  // Modal shared
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  modalSheet:    { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#F4F7F0', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalHandle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(15,23,42,0.15)', alignSelf: 'center', marginBottom: 18 },
  modalHeading:  { color: colors.slate, fontWeight: '900', fontSize: 20, marginBottom: 4 },
  modalSub:      { color: 'rgba(15,23,42,0.5)', fontWeight: '700', fontSize: 13, marginBottom: 20 },
  fieldLabel:    { color: colors.slate, fontWeight: '900', fontSize: 13, marginBottom: 8 },
  nativeInput:   { borderWidth: 1, borderColor: 'rgba(15,23,42,0.12)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontWeight: '700', color: colors.slate, backgroundColor: 'rgba(255,255,255,0.7)', marginBottom: 18 },
  typeGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  typeChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(15,23,42,0.1)', backgroundColor: 'rgba(255,255,255,0.7)' },
  typeChipText:  { fontSize: 12, fontWeight: '800', color: colors.slate },
  visRow:        { flexDirection: 'row', gap: 10, marginBottom: 22 },
  visChip:       { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(15,23,42,0.12)', backgroundColor: 'rgba(255,255,255,0.7)' },
  visChipActive: { backgroundColor: colors.slate, borderColor: colors.slate },
  visChipText:   { fontWeight: '800', fontSize: 13, color: 'rgba(15,23,42,0.55)' },
  visChipTextActive: { color: '#fff' },
  generateBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.purple, borderRadius: 18, paddingVertical: 15 },
  generateBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
