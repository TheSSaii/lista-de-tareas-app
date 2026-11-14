import { Pressable, StyleSheet, View } from "react-native";

import { useTheme } from "../hooks/use-theme";
import type { Filtro } from "../services/filtros";
import { ThemedText } from "./themed-text";

const OPCIONES: readonly { valor: Filtro; etiqueta: string }[] = [
  { valor: "hoy", etiqueta: "Hoy" },
  { valor: "semana", etiqueta: "Semana" },
  { valor: "todas", etiqueta: "Todas" },
];

type Props = {
  valor: Filtro;
  onCambiar: (filtro: Filtro) => void;
};

export function FiltroTareas({ valor, onCambiar }: Props) {
  const tema = useTheme();

  return (
    <View style={styles.contenedor}>
      {OPCIONES.map((opcion) => {
        const seleccionado = opcion.valor === valor;

        return (
          <Pressable
            key={opcion.valor}
            accessibilityRole="tab"
            accessibilityLabel={`Filtrar por ${opcion.etiqueta}`}
            accessibilityState={{ selected: seleccionado }}
            onPress={() => onCambiar(opcion.valor)}
            style={[styles.boton, seleccionado && { backgroundColor: tema.backgroundSelected }]}
          >
            <ThemedText type="smallBold" themeColor={seleccionado ? "text" : "textSecondary"}>
              {opcion.etiqueta}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: "row",
    gap: 8,
  },
  boton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
