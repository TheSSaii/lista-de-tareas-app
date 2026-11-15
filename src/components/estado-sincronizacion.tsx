import { Pressable, StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import type { EstadoSincronizacion as Estado } from "@/services/tipos-sincronizacion";
import { ThemedText } from "./themed-text";

type Props = {
  estado: Estado;
  pendientes: number;
  onSincronizar: () => void;
};

function texto(estado: Estado, pendientes: number): string {
  if (estado === "sincronizando") return "Sincronizando…";
  if (estado === "sin-conexion") return "Sin conexión";
  if (estado === "error") return "No se pudo sincronizar";
  if (estado === "pendiente" || pendientes > 0) {
    return `${pendientes} cambio${pendientes === 1 ? "" : "s"} pendiente${pendientes === 1 ? "" : "s"}`;
  }
  return "Al día";
}

export function EstadoSincronizacion({ estado, pendientes, onSincronizar }: Props) {
  const tema = useTheme();

  if (estado === "inactivo") return null;

  return (
    <View style={styles.fila}>
      <ThemedText themeColor="textSecondary" type="small">
        {texto(estado, pendientes)}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sincronizar ahora"
        onPress={onSincronizar}
        style={[styles.boton, { borderColor: tema.backgroundSelected }]}
      >
        <ThemedText type="smallBold">Sincronizar ahora</ThemedText>
      </Pressable>
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
  boton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
