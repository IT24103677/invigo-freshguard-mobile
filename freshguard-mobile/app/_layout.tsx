import React, { useEffect, useState } from "react";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import "react-native-reanimated";

import { BrandMark } from "@/components/ui/brand-mark";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthSessionProvider } from "@/src/context/auth-session";
import { getCurrentUser } from "@/src/api/auth";
import { getAuthToken, deleteAuthToken } from "@/src/storage/token";
import { theme } from "@/src/theme";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const token = await getAuthToken();

        if (!token) {
          setIsAuthenticated(false);
          return;
        }

        await getCurrentUser();
        setIsAuthenticated(true);
      } catch {
        await deleteAuthToken();
        setIsAuthenticated(false);
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrapAuth();
  }, []);

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    const isInsideTabs = pathname.startsWith("/(tabs)") || pathname === "/";
    const isInsideSalesDetails = pathname.startsWith("/sales/");
    const isOnLogin = pathname === "/login";

    if (isAuthenticated && isOnLogin) {
      router.replace("/(tabs)");
      return;
    }

    if (!isAuthenticated && (isInsideTabs || isInsideSalesDetails)) {
      router.replace("/login");
    }
  }, [isAuthenticated, isBootstrapping, pathname, router]);

  if (isBootstrapping) {
    return (
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <View style={styles.loadingContainer}>
          <BrandMark size={64} />
          <Text style={styles.loadingTitle}>Invigo FreshGuard</Text>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Restoring your session...</Text>
        </View>
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  return (
    <AuthSessionProvider value={{ isAuthenticated, setIsAuthenticated }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack initialRouteName="login">
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthSessionProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 24,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
});
