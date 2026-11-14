import { Pressable, StyleSheet } from "react-native";

import { useTheme } from "../hooks/use-theme";
import { ThemedText } from "./themed-text";

type Props = {
  onPress: () => void;
};

export function BotonNuevaTarea({ onPress }: Props) {
  const tema = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Crear nueva tarea"
      onPress={onPress}
      style={({ pressed }) => [
        styles.boton,
        { backgroundColor: tema.backgroundSelected },
        pressed && styles.presionado,
      ]}
    >
      <ThemedText type="smallBold">Nueva tarea</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  presionado: {
    opacity: 0.7,
  },
});
