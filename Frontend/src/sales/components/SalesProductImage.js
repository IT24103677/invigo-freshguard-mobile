import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { salesCategorySwatchColors } from '../theme';

export default function SalesProductImage({
  imageUrl,
  productName,
  category = 'default',
  size = 64,
  borderRadius = 12,
}) {
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, { width: size, height: size, borderRadius }]}
        resizeMode="cover"
      />
    );
  }

  const key = String(category || 'default').toLowerCase();
  const swatchColor = salesCategorySwatchColors[key] || salesCategorySwatchColors.default;
  const initial = String(productName || '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <View
      style={[
        styles.swatch,
        { width: size, height: size, borderRadius, backgroundColor: swatchColor },
      ]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.38 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#e5e2e1',
  },
  swatch: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontWeight: '800',
    color: '#43474b',
    opacity: 0.75,
  },
});
