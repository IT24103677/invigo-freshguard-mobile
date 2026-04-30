import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { categorySwatchColors } from "@/src/theme/colors";

interface ProductImageProps {
  imageUrl?: string | null;
  productName: string;
  category?: string;
  size?: number;
  borderRadius?: number;
}

/**
 * Shows the product image if available; otherwise renders a
 * coloured swatch with the product's initial letter.
 */
export function ProductImage({
  imageUrl,
  productName,
  category = "default",
  size = 64,
  borderRadius = 12,
}: ProductImageProps) {
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, { width: size, height: size, borderRadius }]}
        resizeMode="cover"
      />
    );
  }

  const key = category.toLowerCase();
  const swatchColor =
    categorySwatchColors[key] ?? categorySwatchColors.default;
  const initial = productName.trim().charAt(0).toUpperCase();

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
    backgroundColor: "#e5e2e1",
  },
  swatch: {
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontWeight: "800",
    color: "#43474b",
    opacity: 0.75,
  },
});
