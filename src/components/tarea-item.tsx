import { Pressable, StyleSheet, View } from "react-native";

import { useTheme } from "../hooks/use-theme";
import { aFecha, estaVencida } from "../services/tarea";
import type { Prioridad, Tarea } from "../services/tarea";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

export const COLOR_ALERTA = "#B42318";

const NOMBRES_PRIORIDAD: Record<Prioridad, string> = {
  1: "Alta",
  2: "Media",
  3: "Baja",
};

const FORMATO_FECHA = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatearFecha(venceEn: string | null): string {
  if (venceEn === null) {
    return "Sin fecha";
  }

  const fecha = aFecha(venceEn);
  return fecha === null ? "Fecha inválida" : FORMATO_FECHA.format(fecha);
}

function etiquetaBoton(tarea: Tarea): string {
  return tarea.completada
    ? `Marcar como pendiente: ${tarea.titulo}`
    : `Marcar como completada: ${tarea.titulo}`;
}

type Props = {
  tarea: Tarea;
  onAlternar: (tarea: Tarea) => void;
};

export function TareaItem({ tarea, onAlternar }: Props) {
  const tema = useTheme();
  const vencida = !tarea.completada && estaVencida(tarea);
  const detalles = `Prioridad ${NOMBRES_PRIORIDAD[tarea.prioridad]} · ${formatearFecha(tarea.vence_en)}`;

  return (
    <ThemedView
      testID="tarea-item"
      type="backgroundElement"
      style={[styles.tarjeta, vencida && styles.vencida]}
    >
      <View style={styles.encabezado}>
        <ThemedText
          accessibilityLabel={vencida ? `${tarea.titulo}, tarea vencida` : tarea.titulo}
          style={[styles.titulo, tarea.completada && styles.completada]}
        >
          {tarea.titulo}
        </ThemedText>
        {vencida && (
          <ThemedText type="smallBold" accessibilityLabel="Tarea vencida" style={styles.insignia}>
            Vencida
          </ThemedText>
        )}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {detalles}
      </ThemedText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={etiquetaBoton(tarea)}
        onPress={() => onAlternar(tarea)}
        style={[styles.boton, { borderColor: tema.textSecondary }]}
      >
        <ThemedText type="smallBold">{tarea.completada ? "Desmarcar" : "Completar"}</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    borderRadius: 12,
    gap: 8,
    padding: 16,
  },
  vencida: {
    borderColor: COLOR_ALERTA,
    borderWidth: 1,
  },
  encabezado: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  titulo: {
    flex: 1,
  },
  completada: {
    opacity: 0.7,
    textDecorationLine: "line-through",
  },
  insignia: {
    color: COLOR_ALERTA,
  },
  boton: {
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
