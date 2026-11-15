import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StyleSheet, useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AvisoGlobal } from "@/components/aviso-tareas";
import { ProveedorTareas } from "@/providers/proveedor-tareas";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={styles.raiz}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <ProveedorTareas>
          <View style={styles.raiz}>
            <Stack screenOptions={{ headerShown: false }} />
            <AvisoGlobal />
          </View>
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
