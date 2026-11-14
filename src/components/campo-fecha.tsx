import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { useTheme } from "../hooks/use-theme";
import { ThemedText } from "./themed-text";

type Selector = "fecha" | "hora" | null;
type SelectorAbierto = Exclude<Selector, null>;

type Props = {
  valor: Date | null;
  onCambiar: (fecha: Date | null) => void;
  error?: string;
};

const FORMATO_FECHA = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function fechaInicial(): Date {
  const fecha = new Date();
  fecha.setHours(9, 0, 0, 0);
  return fecha;
}

function conFecha(base: Date, elegida: Date): Date {
  return new Date(
    elegida.getFullYear(),
    elegida.getMonth(),
    elegida.getDate(),
    base.getHours(),
    base.getMinutes(),
    0,
    0,
  );
}

function conHora(base: Date, elegida: Date): Date {
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    elegida.getHours(),
    elegida.getMinutes(),
    0,
    0,
  );
}

function aplicarCambio(selector: SelectorAbierto, valor: Date | null, elegida: Date): Date {
  if (selector === "hora" && valor !== null) {
    return conHora(valor, elegida);
  }

  return conFecha(valor ?? fechaInicial(), elegida);
}

function etiquetaFecha(valor: Date | null): string {
  return valor === null ? "Sin fecha" : FORMATO_FECHA.format(valor);
}

function BotonFecha({ etiqueta, onPress }: { etiqueta: string; onPress: () => void }) {
  const tema = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      style={[styles.boton, { borderColor: tema.textSecondary }]}
    >
      <ThemedText type="smallBold">{etiqueta}</ThemedText>
    </Pressable>
  );
}

function BotonesVencimiento({
  valor,
  onAbrir,
  onQuitar,
}: {
  valor: Date | null;
  onAbrir: (selector: SelectorAbierto) => void;
  onQuitar: () => void;
}) {
  if (valor === null) {
    return <BotonFecha etiqueta="Añadir fecha" onPress={() => onAbrir("fecha")} />;
  }

  return (
    <View style={styles.botones}>
      <BotonFecha etiqueta="Cambiar fecha" onPress={() => onAbrir("fecha")} />
      <BotonFecha etiqueta="Cambiar hora" onPress={() => onAbrir("hora")} />
      <BotonFecha etiqueta="Quitar fecha" onPress={onQuitar} />
    </View>
  );
}

function SelectorVencimiento({
  selector,
  valor,
  onCambiar,
  onCerrar,
}: {
  selector: SelectorAbierto;
  valor: Date | null;
  onCambiar: (evento: DateTimePickerEvent, elegida?: Date) => void;
  onCerrar: () => void;
}) {
  return (
    <>
      <DateTimePicker
        accessibilityLabel={selector === "fecha" ? "Selector de fecha" : "Selector de hora"}
        value={valor ?? fechaInicial()}
        mode={selector === "fecha" ? "date" : "time"}
        is24Hour
        onChange={onCambiar}
      />
      {Platform.OS === "ios" && <BotonFecha etiqueta="Listo" onPress={onCerrar} />}
    </>
  );
}

export function CampoFecha({ valor, onCambiar, error }: Props) {
  const [selector, setSelector] = useState<Selector>(null);

  function cambiar(evento: DateTimePickerEvent, elegida?: Date) {
    if (evento.type === "dismissed") {
      setSelector(null);
      return;
    }

    if (elegida === undefined || selector === null) {
      return;
    }

    onCambiar(aplicarCambio(selector, valor, elegida));
    if (Platform.OS !== "ios") {
      setSelector(null);
    }
  }

  return (
    <View style={styles.campo}>
      <ThemedText type="smallBold">Vencimiento</ThemedText>
      <ThemedText accessibilityLabel={`Fecha de vencimiento: ${etiquetaFecha(valor)}`}>
        {etiquetaFecha(valor)}
      </ThemedText>

      <BotonesVencimiento valor={valor} onAbrir={setSelector} onQuitar={() => onCambiar(null)} />

      {selector !== null && (
        <SelectorVencimiento
          selector={selector}
          valor={valor}
          onCambiar={cambiar}
          onCerrar={() => setSelector(null)}
        />
      )}

      {error !== undefined && (
        <ThemedText accessibilityRole="alert" style={styles.error}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  campo: {
    gap: 8,
  },
  botones: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  boton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  error: {
    color: "#B42318",
  },
});
