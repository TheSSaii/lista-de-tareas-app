import { Pressable, StyleSheet } from "react-native";

import { useTheme } from "../hooks/use-theme";
import { ThemedText } from "./themed-text";

type Props = {
  puedeDeshacer: boolean;
  onDeshacer: () => void;
};

export function BarraDeshacer({ puedeDeshacer, onDeshacer }: Props) {
  const tema = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Deshacer última acción"
      accessibilityState={{ disabled: !puedeDeshacer }}
      disabled={!puedeDeshacer}
      onPress={onDeshacer}
      style={[
        styles.boton,
        { borderColor: tema.textSecondary },
        !puedeDeshacer && styles.deshabilitado,
      ]}
    >
      <ThemedText type="smallBold">Deshacer</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deshabilitado: {
    opacity: 0.5,
  },
});
