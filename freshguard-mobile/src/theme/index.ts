import { colors } from "./colors";
import { spacing } from "./spacing";
import { typography } from "./typography";

export const radii = {
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  floating: {
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

export const theme = {
  colors,
  spacing,
  typography,
  radii,
  shadows,
} as const;

export type Theme = typeof theme;
