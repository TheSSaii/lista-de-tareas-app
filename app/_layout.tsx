import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StyleSheet, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ProveedorTareas } from "@/providers/proveedor-tareas";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={styles.raiz}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <ProveedorTareas>
          <Stack screenOptions={{ headerShown: false }} />
        </ProveedorTareas>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  raiz: {
    flex: 1,
  },
});
