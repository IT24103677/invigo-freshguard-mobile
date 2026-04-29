import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import { getCurrentUser } from "@/src/api/auth";
import { getSaleById, voidSale } from "@/src/api/sales";
import { AuthUser } from "@/src/types/auth";
import { Sale } from "@/src/types/sale";

export default function SaleDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sale, setSale] = useState<Sale | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [voidMessage, setVoidMessage] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  const loadSale = async () => {
    if (!id) {
      setErrorMessage("Sale id is missing.");
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
    } catch (error) {
      setErrorMessage("Failed to load sale details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSale();
  }, [id]);

  const canVoidSale =
    sale?.status === "ACTIVE" &&
    (currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER");

  const handleVoidSale = async () => {
    if (!sale?._id) {
      return;
    }

    if (!voidReason.trim()) {
      setVoidMessage("Void reason is required.");
      return;
    }

    try {
      setIsVoiding(true);
      setVoidMessage("");
      await voidSale(sale._id, voidReason.trim());
      setVoidReason("");
      setVoidMessage("Sale voided successfully.");
      await loadSale();
    } catch (error: any) {
      setVoidMessage(
        error?.response?.data?.message ?? error?.message ?? "Failed to void sale."
      );
    } finally {
      setIsVoiding(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1f8a43" />
        <Text style={styles.helperText}>Loading sale details...</Text>
      </View>
    );
  }

  if (errorMessage || !sale) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {errorMessage || "Sale details are unavailable."}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Sale Details</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{sale.saleGroupId}</Text>
        <Text style={styles.meta}>Status: {sale.status}</Text>
        <Text style={styles.meta}>Total: Rs. {sale.grandTotal}</Text>
        <Text style={styles.meta}>
          Date: {new Date(sale.saleDateTime).toLocaleString()}
        </Text>
        <Text style={styles.meta}>Recorded By: {sale.recordedBy ?? "N/A"}</Text>
        <Text style={styles.meta}>Your Role: {currentUser?.role ?? "N/A"}</Text>
        <Text style={styles.meta}>Notes: {sale.notes ?? "N/A"}</Text>
        <Text style={styles.meta}>
          Customer: {sale.customerName ?? "N/A"}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        {sale.items.map((item, itemIndex) => (
          <View key={`${item.productId}-${itemIndex}`} style={styles.card}>
            <Text style={styles.cardTitle}>{item.productNameSnapshot}</Text>
            <Text style={styles.meta}>Quantity: {item.quantity}</Text>
            <Text style={styles.meta}>Unit Price: Rs. {item.unitPriceSnapshot}</Text>
            <Text style={styles.meta}>Line Total: Rs. {item.lineTotal}</Text>
            <Text style={styles.meta}>
              Discount Rate: {item.discountRateApplied}%
            </Text>

            <Text style={styles.subheading}>Allocations</Text>
            {item.allocations.map((allocation, allocationIndex) => (
              <View
                key={`${allocation.batchId}-${allocationIndex}`}
                style={styles.allocationBox}
              >
                <Text style={styles.meta}>Batch: {allocation.batchId}</Text>
                <Text style={styles.meta}>
                  Quantity Deducted: {allocation.qtyDeducted}
                </Text>
                <Text style={styles.meta}>
                  Expiry: {new Date(allocation.expiryDateSnapshot).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Audit Information</Text>
        <Text style={styles.meta}>Voided By: {sale.voidedBy ?? "N/A"}</Text>
        <Text style={styles.meta}>
          Voided At: {sale.voidedAt ? new Date(sale.voidedAt).toLocaleString() : "N/A"}
        </Text>
        <Text style={styles.meta}>Void Reason: {sale.voidReason ?? "N/A"}</Text>
        <Text style={styles.meta}>Edited By: {sale.editedBy ?? "N/A"}</Text>
        <Text style={styles.meta}>
          Edited At: {sale.editedAt ? new Date(sale.editedAt).toLocaleString() : "N/A"}
        </Text>
        <Text style={styles.meta}>Edit Reason: {sale.editReason ?? "N/A"}</Text>
      </View>

      {canVoidSale ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manager Void Action</Text>
          <Text style={styles.meta}>
            Only managers and admins can void an active sale.
          </Text>
          <TextInput
            multiline
            onChangeText={setVoidReason}
            placeholder="Enter the reason for voiding this sale"
            style={styles.input}
            textAlignVertical="top"
            value={voidReason}
          />
          {voidMessage ? (
            <Text
              style={
                sale.status === "VOID" || voidMessage.includes("successfully")
                  ? styles.successText
                  : styles.errorText
              }
            >
              {voidMessage}
            </Text>
          ) : null}
          <Pressable
            disabled={isVoiding}
            onPress={handleVoidSale}
            style={({ pressed }) => [
              styles.voidButton,
              pressed && styles.voidButtonPressed,
              isVoiding && styles.voidButtonDisabled,
            ]}
          >
            {isVoiding ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.voidButtonText}>Void Sale</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f7f1",
  },
  content: {
    padding: 20,
    gap: 16,
  },
  centered: {
    flex: 1,
    backgroundColor: "#f4f7f1",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#122418",
  },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#dbe4d8",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#17311d",
  },
  card: {
    borderTopWidth: 1,
    borderTopColor: "#e8eee5",
    paddingTop: 12,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1d3321",
  },
  subheading: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "700",
    color: "#1f8a43",
  },
  allocationBox: {
    backgroundColor: "#f8fbf6",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#dbe4d8",
    marginTop: 6,
  },
  meta: {
    fontSize: 14,
    color: "#4f6152",
  },
  helperText: {
    marginTop: 12,
    fontSize: 15,
    color: "#526052",
  },
  errorText: {
    fontSize: 15,
    color: "#ba1a1a",
    fontWeight: "600",
    textAlign: "center",
  },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: "#d0dacd",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fbfdf9",
    fontSize: 15,
  },
  voidButton: {
    backgroundColor: "#b3261e",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  voidButtonPressed: {
    opacity: 0.85,
  },
  voidButtonDisabled: {
    opacity: 0.7,
  },
  voidButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  successText: {
    color: "#1f8a43",
    fontSize: 14,
    fontWeight: "700",
  },
});
