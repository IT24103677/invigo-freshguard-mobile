import React from "react";
import { Tabs } from "expo-router";
import { Alert } from "react-native";
import { FreshguardTabBar, TabRoute } from "@/components/ui/freshguard-tab-bar";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" }, // hidden — we render our own bar
      }}
      tabBar={(props) => {
        const routeName = props.state.routes[props.state.index].name as TabRoute;
        return (
          <FreshguardTabBar
            activeTab={routeName}
            onNavigate={(tab) => {
              const route = props.state.routes.find((r) => r.name === tab);
              if (route) {
                props.navigation.navigate(tab);
              }
            }}
            onScannerPress={() =>
              Alert.alert("Barcode Scanner", "Barcode scanner coming soon!")
            }
          />
        );
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="index" options={{ title: "POS" }} />
      <Tabs.Screen name="explore" options={{ title: "Sales" }} />
      <Tabs.Screen name="reports" options={{ title: "Reports" }} />
    </Tabs>
  );
}
