import React from 'react';
import { ActivityIndicator, Pressable, Text, StyleSheet } from 'react-native';
import { colors, shadow } from '../theme';

export default function PrimaryButton({ title, onPress, loading, variant = 'emerald', disabled, style }) {
  const bg = variant === 'purple' ? colors.purple : variant === 'dark' ? colors.slate : colors.emerald;
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: pressed ? 0.86 : disabled ? 0.55 : 1 }, style]}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>{title}</Text>}
    </Pressable>
  );
}

export function GhostButton({ title, onPress, style, danger }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.ghost, { opacity: pressed ? 0.7 : 1 }, style]}>
      <Text style={[styles.ghostText, danger && { color: colors.danger }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { height: 56, borderRadius: 22, alignItems: 'center', justifyContent: 'center', ...shadow },
  text: { color: '#fff', fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.1 },
  ghost: { height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: colors.border },
  ghostText: { color: colors.slate, fontSize: 13, fontWeight: '900' },
});
