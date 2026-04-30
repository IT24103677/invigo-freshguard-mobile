import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";

export default function ReportsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="map-marker-outline" size={22} color={colors.primary} />
        <Text style={styles.appTitle}>Invigo FreshGuard</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            name="chart-bar"
            size={64}
            color={colors.secondarySoft}
          />
        </View>
        <Text style={styles.eyebrow}>Module Under Construction</Text>
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.subtitle}>
          Sales analytics, waste logs, and expiry trend reports will be
          available here in a future release.
        </Text>

        <View style={styles.tagRow}>
          {["Sales Trends", "Waste Analytics", "Batch Reports", "Export CSV"].map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagLabel}>{t}</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface + "cc",
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + "50",
  },
  appTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
    paddingBottom: 80,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.secondaryContainer,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.secondary,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "center",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 8,
  },
  tag: {
    backgroundColor: colors.secondaryContainer + "80",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.secondarySoft,
  },
  tagLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.secondary,
  },
});
