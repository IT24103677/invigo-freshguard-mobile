import { StyleSheet } from "react-native";

// ─── Color palette ────────────────────────────────────────────────────────────
export const colors = {
  primary:    "#007A5E",
  ink:        "#0F172A",
  inkLight:   "rgba(15,23,42,0.5)",
  inkFaint:   "rgba(15,23,42,0.08)",
  white:      "#FFFFFF",
  surface:    "rgba(255,255,255,0.92)",
  border:     "rgba(255,255,255,0.4)",
  borderInk:  "rgba(15,23,42,0.08)",

  // semantic
  critical: "#DC2626",
  criticalBg: "#FEF2F2",
  criticalBorder: "#FCA5A5",
  high:     "#EA580C",
  highBg:   "#FFF7ED",
  highBorder: "#FDBA74",
  medium:   "#D97706",
  mediumBg: "#FFFBEB",
  mediumBorder:"#FCD34D",
  success:  "#059669",
  successBg:"#ECFDF5",
  purple:   "#7C3AED",
  purpleBg: "rgba(124,58,237,0.1)",
};

// ─── Level config ─────────────────────────────────────────────────────────────
export const LEVEL_CONFIG = {
  CRITICAL: { label: "Critical",   color: colors.critical, bg: colors.criticalBg, border: colors.criticalBorder, icon: "🔴" },
  HIGH:     { label: "High Risk",  color: colors.high,     bg: colors.highBg,     border: colors.highBorder,     icon: "🟠" },
  MEDIUM:   { label: "Medium",     color: colors.medium,   bg: colors.mediumBg,   border: colors.mediumBorder,   icon: "🟡" },
  LOW:      { label: "Low",        color: colors.success,  bg: colors.successBg,  border: "#86EFAC",             icon: "🟢" },
};

// ─── Shared StyleSheet ────────────────────────────────────────────────────────
export const shared = StyleSheet.create({
  // Layout
  screen: { flex: 1, backgroundColor: "#F1F5F9" },
  container: { flex: 1, padding: 16 },
  scrollContent: { paddingBottom: 40 },

  // Cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },

  // Typography
  pageTitle: { fontSize: 26, fontWeight: "900", color: colors.ink, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 10, fontWeight: "700", color: colors.inkLight, textTransform: "uppercase", letterSpacing: 2, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: colors.ink },
  label: { fontSize: 10, fontWeight: "800", color: colors.ink, textTransform: "uppercase", letterSpacing: 1.5, opacity: 0.6, marginBottom: 6 },
  bodyBold: { fontSize: 14, fontWeight: "700", color: colors.ink },
  bodyMuted: { fontSize: 12, fontWeight: "600", color: colors.inkLight },
  micro: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.5 },

  // Buttons
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  btnOutline: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.borderInk,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  btnOutlineText: { color: colors.ink, fontWeight: "700", fontSize: 12 },
  btnDanger: {
    borderRadius: 12,
    backgroundColor: colors.criticalBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  btnDangerText: { color: colors.critical, fontWeight: "700", fontSize: 12 },
  btnGhost: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  btnGhostText: { color: colors.inkLight, fontWeight: "700", fontSize: 12 },

  // Input
  input: {
    backgroundColor: colors.inkFaint,
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    borderWidth: 1,
    borderColor: "transparent",
  },

  // Pill / badge
  pill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  pillText: { fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },

  // Row helpers
  row: { flexDirection: "row", alignItems: "center" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  gap4: { gap: 4 },
  gap8: { gap: 8 },

  // Banner
  banner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14, marginBottom: 14 },
  bannerError: { backgroundColor: colors.criticalBg, borderWidth: 1, borderColor: colors.criticalBorder },
  bannerSuccess: { backgroundColor: colors.successBg, borderWidth: 1, borderColor: "#6EE7B7" },
  bannerText: { flex: 1, fontWeight: "700", fontSize: 13 },
  bannerErrorText: { color: colors.critical },
  bannerSuccessText: { color: colors.success },

  // Divider
  divider: { height: 1, backgroundColor: colors.inkFaint, marginVertical: 12 },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.borderInk,
    borderRadius: 20,
  },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 13, fontWeight: "700", color: colors.inkLight },
});
