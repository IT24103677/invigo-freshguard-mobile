export const colors = {
  // Base surfaces
  background: "#fcf9f8",
  surface: "#ffffff",
  surfaceLowest: "#ffffff",
  surfaceLow: "#f6f3f2",
  surfaceContainer: "#f0edec",
  surfaceHigh: "#ebe7e7",
  surfaceHighest: "#e5e2e1",
  surfaceDim: "#dcd9d9",

  // Primary (slate blue-grey)
  primary: "#53606a",
  primarySoft: "#bfcdd9",
  primaryContainer: "#bfcdd9",
  primaryFixed: "#d6e4f1",
  onPrimary: "#ffffff",
  onPrimaryContainer: "#4a5761",

  // Secondary (olive gold)
  secondary: "#6c5e08",
  secondarySoft: "#f7e383",
  secondaryContainer: "#f7e383",
  onSecondary: "#ffffff",
  onSecondaryContainer: "#736410",

  // Tertiary / Terracotta (warm red)
  tertiary: "#a33d25",
  tertiaryContainer: "#ffbbab",
  terracotta: "#8c2c16",
  terracottaSoft: "#ffbbab",
  onTertiary: "#ffffff",
  onTertiaryContainer: "#97341d",

  // Neutral text
  text: "#1c1b1b",
  textMuted: "#43474b",
  outline: "#c4c7cb",
  outlineVariant: "#c4c7cb",

  // Semantic
  success: "#1f8a43",
  error: "#ba1a1a",
  errorContainer: "#ffdad6",
  white: "#ffffff",
} as const;

export const saleStatusColors = {
  ACTIVE: {
    background: "#e7f3eb",
    text: "#1f8a43",
  },
  VOID: {
    background: "#fde9e4",
    text: "#8c2c16",
  },
} as const;

/** Maps product category names to a distinct swatch color */
export const categorySwatchColors: Record<string, string> = {
  dairy: "#bfcdd9",
  produce: "#c8e6c9",
  bakery: "#ffe0b2",
  meat: "#ffcdd2",
  frozen: "#b3e5fc",
  beverages: "#e1bee7",
  snacks: "#fff9c4",
  default: "#e5e2e1",
};

