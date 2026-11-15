import { StyleSheet, Switch, View } from "react-native";

import { useTheme } from "../hooks/use-theme";
import type { EstadoSacudida } from "../sensors/use-sacudida";
import { ThemedText } from "./themed-text";

type Props = {
  activo: boolean;
  estado: EstadoSacudida;
  onCambiar: (activo: boolean) => void;
};

function mensajeEstado(estado: EstadoSacudida): string {
  switch (estado) {
    case "comprobando":
      return "Comprobando el acelerómetro…";
    case "activa":
      return "Sacude el teléfono para deshacer.";
    case "no-disponible":
      return "Este dispositivo no tiene acelerómetro disponible.";
    case "sin-permiso":
      return "Sin permiso de movimiento; usa el botón Deshacer.";
    default:
      return "Actívalo para deshacer agitando el teléfono.";
  }
}

export function ControlSacudida({ activo, estado, onCambiar }: Props) {
  const tema = useTheme();

  return (
    <View style={styles.fila}>
      <View style={styles.texto}>
        <ThemedText type="smallBold">Agitar para deshacer</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {mensajeEstado(estado)}
        </ThemedText>
      </View>
      <Switch
        accessibilityLabel="Agitar para deshacer"
        accessibilityState={{ checked: activo }}
        trackColor={{ false: tema.backgroundSelected, true: tema.textSecondary }}
        value={activo}
        onValueChange={onCambiar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  texto: {
    flex: 1,
    gap: 2,
  },
});
