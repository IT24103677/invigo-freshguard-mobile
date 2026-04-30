import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { theme } from "@/src/theme";

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="map-marker-outline" size={22} color={colors.primary} />
        <Text style={styles.appTitle}>Invigo FreshGuard</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            name="view-dashboard-outline"
            size={64}
            color={colors.primarySoft}
          />
        </View>
        <Text style={styles.eyebrow}>Module Under Construction</Text>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>
          Real-time KPIs, freshness scores, and daily waste metrics will appear
          here in a future release.
        </Text>

        <View style={styles.tagRow}>
          {["Sales Today", "Waste Rate", "Stock Health", "AI Alerts"].map((t) => (
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
    backgroundColor: colors.primaryFixed,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.primary,
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
    backgroundColor: colors.surfaceHigh,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  tagLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
});
