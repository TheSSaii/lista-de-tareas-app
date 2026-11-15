import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AvisoGlobal } from "@/components/aviso-tareas";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ProveedorSesion, useSesion } from "@/providers/proveedor-sesion";
import { ProveedorTareas } from "@/providers/proveedor-tareas";
import { destinoSesion } from "@/services/navegacion.sesion";

function Contenido() {
  const { estado } = useSesion();
  const segmentos = useSegments();
  const router = useRouter();

  useEffect(() => {
    const destino = destinoSesion(estado, segmentos.map(String));
    if (destino !== null) {
      router.replace(destino as never);
    }
  }, [estado, segmentos, router]);

  if (estado === "cargando") {
    return (
      <ThemedView style={styles.cargando}>
        <ThemedText themeColor="textSecondary">Cargando…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <AvisoGlobal />
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={styles.raiz}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <ProveedorSesion>
          <ProveedorTareas>
            <View style={styles.raiz}>
              <Contenido />
            </View>
          </ProveedorTareas>
        </ProveedorSesion>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  raiz: {
    flex: 1,
  },
  cargando: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
});
