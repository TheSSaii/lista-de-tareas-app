import { Pressable, StyleSheet } from "react-native";

import { useTheme } from "../hooks/use-theme";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

type Props = {
  mensaje: string;
  onReintentar: () => void;
};

export function EstadoError({ mensaje, onReintentar }: Props) {
  const tema = useTheme();

  return (
    <ThemedView style={styles.contenedor}>
      <ThemedText accessibilityRole="alert" style={styles.mensaje}>
        {mensaje}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reintentar"
        onPress={onReintentar}
        style={[styles.boton, { borderColor: tema.textSecondary }]}
      >
        <ThemedText type="smallBold">Reintentar</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    alignItems: "center",
    gap: 16,
    paddingVertical: 32,
  },
  mensaje: {
    textAlign: "center",
  },
  boton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
