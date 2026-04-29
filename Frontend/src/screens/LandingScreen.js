import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import Logo from '../components/Logo';
import PrimaryButton, { GhostButton } from '../components/PrimaryButton';
import Screen from '../components/Screen';
import { colors } from '../theme';

function FeaturePill({ icon, title, sub, color }) {
  return (
    <View style={styles.pill}>
      <View style={[styles.pillIcon, { backgroundColor: `${color}16` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.pillTitle}>{title}</Text>
        <Text style={styles.pillSub}>{sub}</Text>
      </View>
    </View>
  );
}

function MetricCard({ value, label }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export default function LandingScreen({ go }) {
  return (
    <Screen>
      <View style={styles.header}>
        <Logo />

        <Pressable style={styles.signInChip} onPress={() => go('login')}>
          <Text style={styles.signInText}>Sign In</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Inventory Intelligence</Text>

        <Text style={styles.title}>
          Manage stock, suppliers, and staff in one smart platform.
        </Text>

        <Text style={styles.subtitle}>
          Invigo helps retail teams monitor inventory, reduce expiry losses, manage supplier records, and control staff access securely.
        </Text>
      </View>

      <Card style={styles.dashboardCard}>
        <View style={styles.dashboardTop}>
          <View>
            <Text style={styles.cardLabel}>Today’s Overview</Text>
            <Text style={styles.cardTitle}>Business Health</Text>
          </View>

          <View style={styles.sparkBox}>
            <Ionicons name="analytics-outline" size={26} color={colors.emerald} />
          </View>
        </View>

        <View style={styles.metricsRow}>
          <MetricCard value="128" label="Products" />
          <MetricCard value="24" label="Suppliers" />
          <MetricCard value="12" label="Staff" />
        </View>

        <View style={styles.alertBox}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.emerald} />
          <Text style={styles.alertText}>
            Secure admin access with role-based user control.
          </Text>
        </View>
      </Card>

      <View style={styles.features}>
        <FeaturePill
          icon="cube-outline"
          title="Inventory Control"
          sub="Track products, stock movement, and expiry risks."
          color={colors.emerald}
        />

        <FeaturePill
          icon="business-outline"
          title="Supplier Management"
          sub="Maintain supplier details, categories, and active status."
          color={colors.purple}
        />

        <FeaturePill
          icon="people-outline"
          title="Staff Governance"
          sub="Create, edit, unlock, and revoke user accounts."
          color={colors.magenta}
        />
      </View>

      <View style={styles.actions}>
        <PrimaryButton title="Get Started" onPress={() => go('login')} />
        <GhostButton title="Recover Account" onPress={() => go('forgot')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  signInChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: colors.border,
  },

  signInText: {
    color: colors.slate,
    fontWeight: '900',
    fontSize: 12,
  },

  hero: {
    marginTop: 42,
  },

  eyebrow: {
    color: colors.purple,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 11,
    marginBottom: 12,
  },

  title: {
    color: colors.slate,
    fontSize: 39,
    lineHeight: 44,
    fontWeight: '900',
    letterSpacing: -1.7,
  },

  subtitle: {
    color: 'rgba(15,23,42,0.62)',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600',
    marginTop: 18,
  },

  dashboardCard: {
    marginTop: 26,
  },

  dashboardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cardLabel: {
    color: 'rgba(15,23,42,0.46)',
    fontWeight: '900',
    textTransform: 'uppercase',
    fontSize: 10,
    letterSpacing: 1.3,
  },

  cardTitle: {
    color: colors.slate,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },

  sparkBox: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,122,94,0.10)',
  },

  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },

  metricBox: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.64)',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
  },

  metricValue: {
    color: colors.slate,
    fontSize: 22,
    fontWeight: '900',
  },

  metricLabel: {
    marginTop: 4,
    color: 'rgba(15,23,42,0.48)',
    fontSize: 11,
    fontWeight: '800',
  },

  alertBox: {
    marginTop: 16,
    padding: 13,
    borderRadius: 18,
    backgroundColor: 'rgba(0,122,94,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  alertText: {
    flex: 1,
    color: 'rgba(15,23,42,0.65)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  features: {
    gap: 12,
    marginTop: 22,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    borderRadius: 24,
  },

  pillIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pillTitle: {
    color: colors.slate,
    fontWeight: '900',
    fontSize: 15,
  },

  pillSub: {
    color: 'rgba(15,23,42,0.48)',
    fontWeight: '700',
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
  },

  actions: {
    gap: 12,
    marginTop: 28,
    marginBottom: 20,
  },
});