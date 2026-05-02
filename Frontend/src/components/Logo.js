import React from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function Logo({ size = 42, textSize = 34, light = false }) {
  return (
    <View style={styles.row}>
      <View style={[styles.logoBox, { width: size, height: size, borderRadius: size / 3.2 }]}>
        <Image source={require('../../assets/invigo_logo.png')} style={styles.image} />
      </View>
      <Text style={[styles.brand, light && styles.brandLight, { fontSize: textSize }]}>INVIGO<Text style={{ color: colors.emerald }}>.</Text></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: { backgroundColor: 'rgba(255,255,255,0.75)', padding: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  image: { width: '100%', height: '100%', resizeMode: 'contain' },
  brand: { color: colors.slate, fontWeight: '900', letterSpacing: -1 },
  brandLight: { color: colors.white },
});
