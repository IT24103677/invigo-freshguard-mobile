import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import { getSales } from "@/src/api/sales";
import { Sale } from "@/src/types/sale";

export default function SalesHistoryScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadSales = async () => {
      try {
        setLoading(true);
        setErrorMessage("");
        const result = await getSales();
        setSales(result);
      } catch (error) {
        setErrorMessage("Failed to load sales.");
      } finally {
        setLoading(false);
      }
    };

    loadSales();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1f8a43" />
        <Text style={styles.helperText}>Loading sales...</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sales History</Text>

      <FlatList
        data={sales}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/sales/${item._id}`)}
            style={styles.card}
          >
            <Text style={styles.saleId}>{item.saleGroupId}</Text>
            <Text style={styles.meta}>Status: {item.status}</Text>
            <Text style={styles.meta}>Total: Rs. {item.grandTotal}</Text>
            <Text style={styles.meta}>
              Date: {new Date(item.saleDateTime).toLocaleString()}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.helperText}>No sales found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f7f1",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#122418",
    marginBottom: 16,
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#dbe4d8",
  },
  saleId: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1d3321",
    marginBottom: 8,
  },
  meta: {
    fontSize: 14,
    color: "#4f6152",
    marginBottom: 4,
  },
  centered: {
    flex: 1,
    backgroundColor: "#f4f7f1",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
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
  },
});
