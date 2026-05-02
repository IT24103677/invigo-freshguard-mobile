import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export default function TopBar({ title, onBack, rightText, onRight }) {
  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.slate} />
        </Pressable>
      ) : <View style={{ width: 44 }} />}
      <Text style={styles.title}>{title}</Text>
      {rightText ? <Pressable onPress={onRight} style={styles.right}><Text style={styles.rightText}>{rightText}</Text></Pressable> : <View style={{ width: 44 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  iconBtn: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.72)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 19, fontWeight: '900', color: colors.slate, letterSpacing: -0.3 },
  right: { minWidth: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  rightText: { color: colors.danger, fontWeight: '900', fontSize: 12 },
});
