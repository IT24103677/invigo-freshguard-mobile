import React from 'react';
import { SafeAreaView, ScrollView, View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../theme';

export default function Screen({ children, scroll = true, style }) {
  const content = (
    <View style={[styles.content, style]}>
      <View style={[styles.blob, styles.blobOne]} />
      <View style={[styles.blob, styles.blobTwo]} />
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  content: { flex: 1, padding: 20, overflow: 'hidden' },
  blob: { position: 'absolute', width: 260, height: 260, borderRadius: 160, opacity: 0.14 },
  blobOne: { backgroundColor: colors.emerald, top: -90, left: -100 },
  blobTwo: { backgroundColor: colors.purple, bottom: -120, right: -90 },
});
