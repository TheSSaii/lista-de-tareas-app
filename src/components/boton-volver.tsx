import { Pressable, StyleSheet } from "react-native";

import { useTheme } from "../hooks/use-theme";
import { volver } from "./navegacion";
import { ThemedText } from "./themed-text";

export function BotonVolver() {
  const tema = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver"
      onPress={volver}
      style={[styles.boton, { borderColor: tema.textSecondary }]}
    >
      <ThemedText type="smallBold">Volver</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
