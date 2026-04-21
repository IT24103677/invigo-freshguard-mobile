import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { COLORS } from '../constants/config';

const StatCard = ({ title, value, icon, color = COLORS.primary, subtitle }) => {
  return (
    <Card style={[styles.card, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <Card.Content style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    marginBottom: 12,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  textContainer: {
    flex: 1,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  title: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
});

export default StatCard;
