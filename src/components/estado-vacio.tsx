import { StyleSheet } from "react-native";

import { BotonNuevaTarea } from "./boton-nueva-tarea";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

type Props = {
  mensaje: string;
  onNuevaTarea?: () => void;
};

export function EstadoVacio({ mensaje, onNuevaTarea }: Props) {
  return (
    <ThemedView style={styles.contenedor}>
      <ThemedText type="subtitle" style={styles.mensaje}>
        {mensaje}
      </ThemedText>
      {onNuevaTarea !== undefined && <BotonNuevaTarea onPress={onNuevaTarea} />}
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
});
