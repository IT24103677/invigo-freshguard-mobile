import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useEffect } from "react";

import { getProducts } from "@/src/api/products";
import { createSale } from "@/src/api/sales";
import { Product } from "@/src/types/product";

export default function SalesPosScreen() {
  const [productId, setProductId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [quantity, setQuantity] = useState("1");
  const [amountGiven, setAmountGiven] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setProductsLoading(true);
        const result = await getProducts();
        setProducts(result);
      } catch (error) {
        setErrorMessage("Failed to load products.");
      } finally {
        setProductsLoading(false);
      }
    };

    loadProducts();
  }, []);

  const handleCreateSale = async () => {
    const parsedQuantity = Number(quantity);
    const parsedAmountGiven = Number(amountGiven);

    if (!productId.trim()) {
      setErrorMessage("Product ID is required.");
      return;
    }

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setErrorMessage("Quantity must be a whole number greater than zero.");
      return;
    }

    if (!amountGiven.trim() || Number.isNaN(parsedAmountGiven) || parsedAmountGiven < 0) {
      setErrorMessage("Amount given must be a valid non-negative number.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setMessage("");

      const sale = await createSale({
        notes: notes.trim() || undefined,
        amountGiven: parsedAmountGiven,
        items: [
          {
            productId: productId.trim(),
            quantity: parsedQuantity,
            discountRateApplied: 0,
          },
        ],
      });

      setMessage(
        `Sale ${sale.saleGroupId} created successfully. Change: Rs. ${sale.changeGiven ?? 0}`
      );
      setQuantity("1");
      setAmountGiven("");
      setNotes("");
      setSelectedProduct(null);
      setProductId("");
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.message ??
          error?.message ??
          "Failed to create sale."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Sales POS</Text>
        <Text style={styles.subtitle}>
          Select a product, enter quantity and payment, and create a real sale.
        </Text>

        <View style={styles.formCard}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Select Product</Text>
            {productsLoading ? (
              <ActivityIndicator color="#1f8a43" />
            ) : (
              <View style={styles.productList}>
                {products.map((product) => {
                  const isSelected = selectedProduct?._id === product._id;
                  return (
                    <Pressable
                      key={product._id}
                      onPress={() => {
                        setSelectedProduct(product);
                        setProductId(product._id);
                        setErrorMessage("");
                      }}
                      style={[
                        styles.productCard,
                        isSelected && styles.productCardSelected,
                      ]}
                    >
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productMeta}>
                        {product.category} • Rs. {product.sellingPrice}
                      </Text>
                      <Text style={styles.productMeta}>ID: {product._id}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Quantity</Text>
            <TextInput
              keyboardType="number-pad"
              onChangeText={setQuantity}
              placeholder="Enter quantity"
              style={styles.input}
              value={quantity}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Amount Given</Text>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setAmountGiven}
              placeholder="Enter amount given"
              style={styles.input}
              value={amountGiven}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              multiline
              onChangeText={setNotes}
              placeholder="Optional sale notes"
              style={[styles.input, styles.notesInput]}
              textAlignVertical="top"
              value={notes}
            />
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {message ? <Text style={styles.successText}>{message}</Text> : null}

          <Pressable
            disabled={isSubmitting}
            onPress={handleCreateSale}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              isSubmitting && styles.buttonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Create Sale</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#122418",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#526052",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#dbe4d8",
    gap: 14,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2d1f",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d0dacd",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fbfdf9",
    fontSize: 15,
  },
  notesInput: {
    minHeight: 96,
  },
  productList: {
    gap: 10,
  },
  productCard: {
    borderWidth: 1,
    borderColor: "#d0dacd",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#fbfdf9",
    gap: 4,
  },
  productCardSelected: {
    borderColor: "#1f8a43",
    backgroundColor: "#eef8f0",
  },
  productName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#17311d",
  },
  productMeta: {
    fontSize: 13,
    color: "#526052",
  },
  button: {
    backgroundColor: "#1f8a43",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.86,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  errorText: {
    color: "#ba1a1a",
    fontSize: 14,
    fontWeight: "600",
  },
  successText: {
    color: "#1f8a43",
    fontSize: 14,
    fontWeight: "700",
  },
});
