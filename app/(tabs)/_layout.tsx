import { Tabs } from "expo-router";

import { useTheme } from "@/hooks/use-theme";

export default function TabsLayout() {
  const tema = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tema.text,
        tabBarInactiveTintColor: tema.textSecondary,
        tabBarStyle: {
          backgroundColor: tema.background,
          borderTopColor: tema.backgroundSelected,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Pendientes" }} />
      <Tabs.Screen name="hechas" options={{ title: "Hechas" }} />
    </Tabs>
  );
}
