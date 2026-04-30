import React from "react";
import { Image, StyleSheet, View } from "react-native";
import freshguardLogo from "@/assets/images/freshguard-logo.png";

interface BrandMarkProps {
  size?: number;
}

export function BrandMark({ size = 24 }: BrandMarkProps) {
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.28),
        },
      ]}
    >
      <Image
        source={freshguardLogo}
        style={styles.image}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
