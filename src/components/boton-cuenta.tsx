import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { ThemedText } from "./themed-text";

export function BotonCuenta() {
  const tema = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Abrir cuenta"
      onPress={() => {
        router.push("/cuenta" as never);
      }}
      style={[styles.boton, { borderColor: tema.backgroundSelected }]}
    >
      <ThemedText type="smallBold">Cuenta</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
