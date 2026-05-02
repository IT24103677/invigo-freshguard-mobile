import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Card from '../components/Card';
import { colors } from '../theme';

export default function PlaceholderScreen({ title, label }) {
  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>This area is part of the dashboard shell, but only Inventory is active in this build.</Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.cardKicker}>Coming Soon</Text>
        <Text style={styles.cardTitle}>{label}</Text>
        <Text style={styles.cardText}>
          The screen is intentionally present so the app matches the provided design direction, while the working implementation stays focused on inventory management.
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 20,
  },
  hero: {
    gap: 8,
  },
  title: {
    color: colors.slate,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    color: colors.muted,
    fontWeight: '700',
    lineHeight: 20,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontSize: 12,
  },
  card: {
    padding: 24,
    gap: 12,
  },
  cardKicker: {
    color: colors.emerald,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '900',
    fontSize: 10,
  },
  cardTitle: {
    color: colors.slate,
    fontSize: 20,
    fontWeight: '900',
  },
  cardText: {
    color: colors.muted,
    lineHeight: 22,
    fontWeight: '700',
  },
});
