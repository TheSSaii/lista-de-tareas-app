import { Pressable, StyleSheet, View } from "react-native";

import { useTheme } from "../hooks/use-theme";
import { useTareas } from "../providers/proveedor-tareas";
import { ThemedText } from "./themed-text";

type Props = {
  aviso: string | null;
  onCerrar: () => void;
};

export function AvisoTareas({ aviso, onCerrar }: Props) {
  const tema = useTheme();

  if (aviso === null) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.contenedor, { backgroundColor: tema.backgroundElement }]}
    >
      <ThemedText accessibilityRole="alert" style={styles.texto}>
        {aviso}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar aviso"
        onPress={onCerrar}
        style={[styles.boton, { borderColor: tema.textSecondary }]}
      >
        <ThemedText type="smallBold">Cerrar</ThemedText>
      </Pressable>
    </View>
  );
}

export function AvisoGlobal() {
  const { aviso, descartarAviso } = useTareas();
  return <AvisoTareas aviso={aviso} onCerrar={descartarAviso} />;
}

const styles = StyleSheet.create({
  contenedor: {
    alignItems: "center",
    borderRadius: 12,
    bottom: 24,
    flexDirection: "row",
    gap: 12,
    left: 16,
    padding: 16,
    position: "absolute",
    right: 16,
  },
  texto: {
    flex: 1,
  },
  boton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
