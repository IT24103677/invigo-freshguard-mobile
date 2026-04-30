import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";

import { getCurrentUser } from "@/src/api/auth";
import {
  getSaleById,
  updateSale,
  uploadSaleReceipt,
  voidSale,
} from "@/src/api/sales";
import { colors, saleStatusColors } from "@/src/theme/colors";
import { theme } from "@/src/theme";
import { AuthUser } from "@/src/types/auth";
import { Sale, SaleItem } from "@/src/types/sale";
import { ProductImage } from "@/components/ui/product-image";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SaleItemCard({ item }: { item: SaleItem }) {
  const discountAmount =
    item.quantity * item.unitPriceSnapshot * (item.discountRateApplied / 100);

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <ProductImage
          imageUrl={null}
          productName={item.productNameSnapshot}
          category="default"
          size={48}
          borderRadius={10}
        />
        <View style={styles.itemMeta}>
          <Text style={styles.itemName}>{item.productNameSnapshot}</Text>
          <Text style={styles.itemSub}>
            {item.quantity} x Rs. {item.unitPriceSnapshot.toFixed(2)}
          </Text>
          {item.discountRateApplied > 0 && (
            <Text style={styles.itemDiscount}>
              Discount {item.discountRateApplied}% (-Rs.{" "}
              {discountAmount.toFixed(2)})
            </Text>
          )}
        </View>
        <Text style={styles.itemTotal}>Rs. {item.lineTotal.toFixed(2)}</Text>
      </View>

      {item.allocations.length > 0 && (
        <View style={styles.allocations}>
          <Text style={styles.allocLabel}>BATCH ALLOCATIONS</Text>
          {item.allocations.map((allocation, index) => (
            <View
              key={`${allocation.batchId}-${index}`}
              style={styles.allocRow}
            >
              <MaterialCommunityIcons
                name="cube-outline"
                size={14}
                color={colors.primary}
              />
              <Text style={styles.allocText}>
                {String(allocation.batchId).slice(-8).toUpperCase()} -{" "}
                {allocation.qtyDeducted} units
              </Text>
              <Text style={styles.allocExpiry}>
                Exp: {formatDate(allocation.expiryDateSnapshot)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function SaleDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sale, setSale] = useState<Sale | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [showEditPanel, setShowEditPanel] = useState(false);
  const [customerNameInput, setCustomerNameInput] = useState("");
  const [customerEmailInput, setCustomerEmailInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [editReasonInput, setEditReasonInput] = useState("");
  const [editMsg, setEditMsg] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [voidReason, setVoidReason] = useState("");
  const [voidMsg, setVoidMsg] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  const [showVoidPanel, setShowVoidPanel] = useState(false);
  const [receiptMsg, setReceiptMsg] = useState("");
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  const loadSale = useCallback(async () => {
    if (!id) {
      setErrorMessage("Sale ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      const [saleResult, userResult] = await Promise.all([
        getSaleById(id),
        getCurrentUser(),
      ]);

      setSale(saleResult);
      setCurrentUser(userResult);
      setCustomerNameInput(saleResult.customerName ?? "");
      setCustomerEmailInput(saleResult.customerEmail ?? "");
      setNotesInput(saleResult.notes ?? "");
    } catch {
      setErrorMessage("Failed to load sale details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadSale();
  }, [loadSale]);

  const canEdit = sale?.status === "ACTIVE";
  const canVoid =
    sale?.status === "ACTIVE" &&
    (currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER");

  const resetEditPanel = () => {
    setShowEditPanel(false);
    setEditReasonInput("");
    setEditMsg("");
    setCustomerNameInput(sale?.customerName ?? "");
    setCustomerEmailInput(sale?.customerEmail ?? "");
    setNotesInput(sale?.notes ?? "");
  };

  const handleSaveEdit = async () => {
    if (!sale?._id) return;

    if (!editReasonInput.trim()) {
      setEditMsg("Edit reason is required.");
      return;
    }

    try {
      setIsSavingEdit(true);
      setEditMsg("");
      await updateSale(sale._id, {
        customerName: customerNameInput.trim() || undefined,
        customerEmail: customerEmailInput.trim() || undefined,
        notes: notesInput.trim() || undefined,
        editReason: editReasonInput.trim(),
      });
      setEditMsg("Sale updated successfully.");
      setShowEditPanel(false);
      setEditReasonInput("");
      await loadSale();
    } catch (err: any) {
      setEditMsg(
        err?.response?.data?.message ?? err?.message ?? "Failed to update sale."
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleVoid = async () => {
    if (!sale?._id) return;

    if (!voidReason.trim()) {
      setVoidMsg("Void reason is required.");
      return;
    }

    try {
      setIsVoiding(true);
      setVoidMsg("");
      await voidSale(sale._id, voidReason.trim());
      setVoidReason("");
      setVoidMsg("Sale voided successfully.");
      setShowVoidPanel(false);
      await loadSale();
    } catch (err: any) {
      setVoidMsg(
        err?.response?.data?.message ?? err?.message ?? "Failed to void sale."
      );
    } finally {
      setIsVoiding(false);
    }
  };

  const handleAttachReceipt = () => {
    if (!sale?._id || isUploadingReceipt) return;

    Alert.alert(
      sale.receiptImageUrl ? "Replace Receipt" : "Attach Receipt",
      "Choose how you want to add the receipt image.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Camera",
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();

            if (!permission.granted) {
              setReceiptMsg(
                "Camera permission is required to capture a receipt."
              );
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              allowsEditing: true,
              quality: 0.7,
            });

            if (!result.canceled) {
              await handleUploadReceipt(result.assets[0]);
            }
          },
        },
        {
          text: "Gallery",
          onPress: async () => {
            const permission =
              await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permission.granted) {
              setReceiptMsg(
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
              await handleUploadReceipt(result.assets[0]);
            }
          },
        },
      ]
    );
  };

  const handleUploadReceipt = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!sale?._id) return;

    try {
      setIsUploadingReceipt(true);
      setReceiptMsg("");
      await uploadSaleReceipt(sale._id, asset);
      setReceiptMsg(
        sale.receiptImageUrl
          ? "Receipt replaced successfully."
          : "Receipt attached successfully."
      );
      await loadSale();
    } catch (err: any) {
      setReceiptMsg(
        err?.response?.data?.message ??
          err?.message ??
          "Failed to upload receipt."
      );
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.helperText}>Loading sale details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage || !sale) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.centered}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={48}
            color={colors.terracotta}
          />
          <Text style={styles.errorText}>
            {errorMessage || "Sale unavailable."}
          </Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusColors = saleStatusColors[sale.status];
  const isVoid = sale.status === "VOID";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.appBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backIcon}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={colors.primary}
          />
        </Pressable>
        <Text style={styles.appBarTitle}>Sale Details</Text>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: statusColors.background },
          ]}
        >
          <Text
            style={[styles.statusPillText, { color: statusColors.text }]}
          >
            {sale.status}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <View style={styles.heroBanner}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroEyebrow}>SALES RECEIPT</Text>
              <Text style={styles.heroTitle}>{sale.saleGroupId}</Text>
              <Text style={styles.heroDate}>
                {formatDateTime(sale.saleDateTime)}
              </Text>
            </View>
            <View style={styles.heroMeta}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreNum}>{sale.items.length}</Text>
                <Text style={styles.scoreLabel}>Items</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.financialBento}>
          <View style={styles.financialRow}>
            <View style={styles.financialCard}>
              <Text style={styles.financialLabel}>SUBTOTAL</Text>
              <Text style={styles.financialValue}>
                Rs. {sale.subTotal.toFixed(2)}
              </Text>
            </View>
            <View
              style={[
                styles.financialCard,
                { backgroundColor: colors.secondaryContainer },
              ]}
            >
              <Text
                style={[
                  styles.financialLabel,
                  { color: colors.secondary },
                ]}
              >
                DISCOUNT
              </Text>
              <Text
                style={[
                  styles.financialValue,
                  { color: colors.secondary },
                ]}
              >
                -Rs. {sale.discountTotal.toFixed(2)}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.financialCardWide,
              { backgroundColor: colors.primaryContainer },
            ]}
          >
            <Text
              style={[
                styles.financialLabel,
                { color: colors.onPrimaryContainer },
              ]}
            >
              GRAND TOTAL
            </Text>
            <Text
              style={[styles.financialValueLg, { color: colors.primary }]}
            >
              Rs. {sale.grandTotal.toFixed(2)}
            </Text>
            {sale.amountGiven != null && (
              <Text style={styles.changeText}>
                Paid: Rs. {sale.amountGiven.toFixed(2)} - Change: Rs.{" "}
                {(sale.changeGiven ?? 0).toFixed(2)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <MaterialCommunityIcons
              name="package-variant"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.sectionTitle}>Items Sold</Text>
          </View>
          {sale.items.map((item, idx) => (
            <SaleItemCard key={`${item.productId}-${idx}`} item={item} />
          ))}
        </View>

        {(sale.customerName || sale.customerEmail || sale.notes) && (
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <MaterialCommunityIcons
                name="account-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.sectionTitle}>Customer Info</Text>
            </View>
            <View style={styles.infoCard}>
              {sale.customerName && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Name</Text>
                  <Text style={styles.infoVal}>{sale.customerName}</Text>
                </View>
              )}
              {sale.customerEmail && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Email</Text>
                  <Text style={styles.infoVal}>{sale.customerEmail}</Text>
                </View>
              )}
              {sale.notes && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Notes</Text>
                  <Text style={styles.infoVal}>{sale.notes}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <MaterialCommunityIcons
              name="receipt-text"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.sectionTitle}>Receipt Attachment</Text>
          </View>
          <View style={styles.receiptCard}>
            {sale.receiptImageUrl ? (
              <>
              <Image
                source={{ uri: sale.receiptImageUrl }}
                style={styles.receiptImage}
                contentFit="cover"
              />
              <Text style={styles.receiptCaption}>
                Receipt image attached to this sale.
              </Text>
              </>
            ) : (
              <View style={styles.receiptEmptyState}>
                <MaterialCommunityIcons
                  name="receipt-text-plus-outline"
                  size={32}
                  color={colors.outline}
                />
                <Text style={styles.receiptCaption}>
                  No receipt image is attached to this sale yet.
                </Text>
              </View>
            )}

            {receiptMsg ? (
              <Text
                style={[
                  styles.receiptMsg,
                  receiptMsg.includes("successfully")
                    ? { color: colors.success }
                    : { color: colors.terracotta },
                ]}
              >
                {receiptMsg}
              </Text>
            ) : null}

            <Pressable
              onPress={handleAttachReceipt}
              disabled={isUploadingReceipt}
              style={({ pressed }) => [
                styles.receiptActionBtn,
                pressed && { opacity: 0.85 },
                isUploadingReceipt && { opacity: 0.7 },
              ]}
            >
              {isUploadingReceipt ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name={
                      sale.receiptImageUrl
                        ? "image-edit-outline"
                        : "receipt-text-plus-outline"
                    }
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={styles.receiptActionBtnText}>
                    {sale.receiptImageUrl ? "Replace Receipt" : "Attach Receipt"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {canEdit && (
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <MaterialCommunityIcons
                name="pencil-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.sectionTitle}>Edit Sale</Text>
            </View>

            {!showEditPanel ? (
              <Pressable
                onPress={() => {
                  setShowEditPanel(true);
                  setEditMsg("");
                }}
                style={({ pressed }) => [
                  styles.editButton,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <MaterialCommunityIcons
                  name="file-document-edit-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.editButtonText}>
                  Edit Customer Info / Notes
                </Text>
              </Pressable>
            ) : (
              <View style={styles.editPanel}>
                <Text style={styles.editPanelInfo}>
                  Only metadata can be edited here. Product quantities,
                  allocations, and totals remain unchanged.
                </Text>

                <TextInput
                  value={customerNameInput}
                  onChangeText={setCustomerNameInput}
                  placeholder="Customer name"
                  placeholderTextColor={colors.outline}
                  style={styles.editInput}
                />

                <TextInput
                  value={customerEmailInput}
                  onChangeText={setCustomerEmailInput}
                  placeholder="Customer email"
                  placeholderTextColor={colors.outline}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.editInput}
                />

                <TextInput
                  value={notesInput}
                  onChangeText={setNotesInput}
                  placeholder="Notes"
                  placeholderTextColor={colors.outline}
                  multiline
                  textAlignVertical="top"
                  style={[styles.editInput, styles.editNotesInput]}
                />

                <TextInput
                  value={editReasonInput}
                  onChangeText={setEditReasonInput}
                  placeholder="Edit reason"
                  placeholderTextColor={colors.outline}
                  style={styles.editInput}
                />

                {editMsg ? (
                  <Text
                    style={[
                      styles.editMsg,
                      editMsg.includes("successfully")
                        ? { color: colors.success }
                        : { color: colors.terracotta },
                    ]}
                  >
                    {editMsg}
                  </Text>
                ) : null}

                <View style={styles.editActions}>
                  <Pressable onPress={resetEditPanel} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveEdit}
                    disabled={isSavingEdit}
                    style={({ pressed }) => [
                      styles.editConfirmBtn,
                      pressed && { opacity: 0.85 },
                      isSavingEdit && { opacity: 0.7 },
                    ]}
                  >
                    {isSavingEdit ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Text style={styles.editConfirmBtnText}>
                        Save Changes
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.sectionTitle}>Audit Trail</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Recorded By</Text>
              <Text style={styles.infoVal}>{sale.recordedBy ?? "N/A"}</Text>
            </View>
            {isVoid && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Voided By</Text>
                  <Text
                    style={[styles.infoVal, { color: colors.terracotta }]}
                  >
                    {sale.voidedBy ?? "N/A"}
                  </Text>
                </View>
                {sale.voidedAt && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Voided At</Text>
                    <Text style={styles.infoVal}>
                      {formatDateTime(sale.voidedAt)}
                    </Text>
                  </View>
                )}
                {sale.voidReason && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Void Reason</Text>
                    <Text style={[styles.infoVal, { fontStyle: "italic" }]}>
                      {sale.voidReason}
                    </Text>
                  </View>
                )}
              </>
            )}
            {sale.editedBy && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Edited By</Text>
                  <Text style={styles.infoVal}>{sale.editedBy}</Text>
                </View>
                {sale.editedAt && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Edited At</Text>
                    <Text style={styles.infoVal}>
                      {formatDateTime(sale.editedAt)}
                    </Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Edit Reason</Text>
                  <Text style={[styles.infoVal, { fontStyle: "italic" }]}>
                    {sale.editReason ?? "-"}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {canVoid && (
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <MaterialCommunityIcons
                name="cancel"
                size={20}
                color={colors.terracotta}
              />
              <Text
                style={[styles.sectionTitle, { color: colors.terracotta }]}
              >
                Manager Action
              </Text>
            </View>

            {!showVoidPanel ? (
              <Pressable
                onPress={() => setShowVoidPanel(true)}
                style={({ pressed }) => [
                  styles.showVoidBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <MaterialCommunityIcons
                  name="delete-forever-outline"
                  size={18}
                  color={colors.terracotta}
                />
                <Text style={styles.showVoidBtnText}>Void This Sale</Text>
              </Pressable>
            ) : (
              <View style={styles.voidPanel}>
                <Text style={styles.voidPanelInfo}>
                  Voiding will restore all batch stock. This action cannot be
                  undone.
                </Text>
                <TextInput
                  multiline
                  value={voidReason}
                  onChangeText={setVoidReason}
                  placeholder="Enter the reason for voiding this sale..."
                  placeholderTextColor={colors.outline}
                  style={styles.voidInput}
                  textAlignVertical="top"
                />
                {voidMsg ? (
                  <Text
                    style={[
                      styles.voidMsg,
                      voidMsg.includes("successfully")
                        ? { color: colors.success }
                        : { color: colors.terracotta },
                    ]}
                  >
                    {voidMsg}
                  </Text>
                ) : null}
                <View style={styles.voidActions}>
                  <Pressable
                    onPress={() => {
                      setShowVoidPanel(false);
                      setVoidReason("");
                      setVoidMsg("");
                    }}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleVoid}
                    disabled={isVoiding}
                    style={({ pressed }) => [
                      styles.voidConfirmBtn,
                      pressed && { opacity: 0.85 },
                      isVoiding && { opacity: 0.7 },
                    ]}
                  >
                    {isVoiding ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Text style={styles.voidConfirmBtnText}>
                        Confirm Void
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  helperText: { fontSize: 15, color: colors.textMuted, marginTop: 8 },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.terracotta,
    textAlign: "center",
  },
  backBtn: {
    marginTop: 8,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onPrimaryContainer,
  },
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: colors.surface + "cc",
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + "40",
  },
  backIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  appBarTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: colors.primary,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  scroll: { padding: 20, gap: 4 },
  heroBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    backgroundColor: colors.primaryFixed,
    borderRadius: 20,
    padding: 20,
    marginBottom: 4,
    ...theme.shadows.card,
  },
  heroWrap: { gap: 12, marginBottom: 4 },
  heroTextBlock: { gap: 4, flex: 1 },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.primary,
  },
  heroTitle: { fontSize: 22, fontWeight: "800", color: colors.text },
  heroDate: { fontSize: 13, color: colors.textMuted },
  heroMeta: { alignItems: "center" },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryContainer,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNum: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primary,
    lineHeight: 22,
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.primary + "99",
    textTransform: "uppercase",
  },
  financialBento: { gap: 10, marginTop: 4, marginBottom: 4 },
  financialRow: { flexDirection: "row", gap: 10 },
  financialCard: {
    flex: 1,
    backgroundColor: colors.surfaceHigh,
    borderRadius: 14,
    padding: 14,
    gap: 4,
    ...theme.shadows.card,
  },
  financialCardWide: {
    borderRadius: 14,
    padding: 16,
    gap: 4,
    ...theme.shadows.card,
  },
  financialLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  financialValue: { fontSize: 18, fontWeight: "800", color: colors.text },
  financialValueLg: { fontSize: 28, fontWeight: "800" },
  changeText: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  section: { marginTop: 20, gap: 10 },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.outlineVariant + "50",
    ...theme.shadows.card,
  },
  itemHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  itemMeta: { flex: 1, gap: 2 },
  itemName: { fontSize: 15, fontWeight: "700", color: colors.text },
  itemSub: { fontSize: 13, color: colors.textMuted },
  itemDiscount: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: "600",
  },
  itemTotal: { fontSize: 15, fontWeight: "800", color: colors.primary },
  allocations: {
    backgroundColor: colors.surfaceLow,
    borderRadius: 10,
    padding: 10,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + "40",
  },
  allocLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: 2,
  },
  allocRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  allocText: { flex: 1, fontSize: 12, color: colors.text, fontWeight: "600" },
  allocExpiry: { fontSize: 11, color: colors.textMuted },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant + "50",
    gap: 10,
    ...theme.shadows.card,
  },
  receiptCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant + "50",
    gap: 10,
    ...theme.shadows.card,
  },
  receiptImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: colors.surfaceHigh,
  },
  receiptCaption: {
    fontSize: 13,
    color: colors.textMuted,
  },
  receiptEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    backgroundColor: colors.surfaceLow,
    borderRadius: 12,
  },
  receiptMsg: {
    fontSize: 13,
    fontWeight: "600",
  },
  receiptActionBtn: {
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
  receiptActionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  infoKey: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    flex: 1,
  },
  infoVal: { fontSize: 13, color: colors.text, flex: 2, textAlign: "right" },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: colors.primaryContainer + "55",
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  editPanel: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    ...theme.shadows.card,
  },
  editPanelInfo: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  editInput: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surfaceLow,
    fontSize: 14,
    color: colors.text,
  },
  editNotesInput: {
    minHeight: 80,
  },
  editMsg: { fontSize: 13, fontWeight: "600" },
  editActions: { flexDirection: "row", gap: 10 },
  editConfirmBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  editConfirmBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
  showVoidBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: colors.terracotta,
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: "#fde9e4",
  },
  showVoidBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.terracotta,
  },
  voidPanel: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.terracotta + "60",
    ...theme.shadows.card,
  },
  voidPanelInfo: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  voidInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surfaceLow,
    fontSize: 14,
    color: colors.text,
  },
  voidMsg: { fontSize: 13, fontWeight: "600" },
  voidActions: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceHigh,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textMuted,
  },
  voidConfirmBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.terracotta,
    alignItems: "center",
    justifyContent: "center",
  },
  voidConfirmBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
});
