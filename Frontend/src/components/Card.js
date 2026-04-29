import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, shadow } from '../theme';

export default function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'rgba(255,255,255,0.86)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.65)', borderRadius: 30, padding: 18, ...shadow },
});
