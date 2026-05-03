import React from 'react';
import { SafeAreaView, ScrollView, View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../theme';

export default function Screen({ children, scroll = true, style, keyboardVerticalOffset = 0 }) {
  const content = (
    <View style={[styles.content, scroll ? styles.contentScroll : styles.contentFill, style]}>
      <View style={[styles.blob, styles.blobOne]} />
      <View style={[styles.blob, styles.blobTwo]} />
      {children}
    </View>
  );

  const keyboardBehavior = Platform.select({
    ios: 'padding',
    android: 'height',
    default: undefined,
  });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={keyboardBehavior}
        enabled={Platform.OS !== 'web'}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        ) : content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: { padding: 20, overflow: 'hidden' },
  contentFill: { flex: 1 },
  contentScroll: { flexGrow: 1, paddingBottom: 32 },
  blob: { position: 'absolute', width: 260, height: 260, borderRadius: 160, opacity: 0.14 },
  blobOne: { backgroundColor: colors.emerald, top: -90, left: -100 },
  blobTwo: { backgroundColor: colors.purple, bottom: -120, right: -90 },
});
