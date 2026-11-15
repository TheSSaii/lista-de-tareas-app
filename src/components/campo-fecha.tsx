import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { useTheme } from "../hooks/use-theme";
import { ThemedText } from "./themed-text";

type Selector = "fecha" | "hora" | null;
type SelectorAbierto = Exclude<Selector, null>;

const ES_IOS = Platform.OS === "ios";

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
  // En iOS el selector es datetime: la fecha elegida ya trae la hora.
  if (ES_IOS) {
    return new Date(
      elegida.getFullYear(),
      elegida.getMonth(),
      elegida.getDate(),
      elegida.getHours(),
      elegida.getMinutes(),
      0,
      0,
    );
  }

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
    return (
      <BotonFecha
        etiqueta={ES_IOS ? "Elegir fecha y hora" : "Añadir fecha"}
        onPress={() => onAbrir("fecha")}
      />
    );
  }

  return (
    <View style={styles.botones}>
      <BotonFecha
        etiqueta={ES_IOS ? "Cambiar fecha y hora" : "Cambiar fecha"}
        onPress={() => onAbrir("fecha")}
      />
      {!ES_IOS && <BotonFecha etiqueta="Cambiar hora" onPress={() => onAbrir("hora")} />}
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
  const modo = ES_IOS ? "datetime" : selector === "fecha" ? "date" : "time";

  return (
    <>
      <DateTimePicker
        accessibilityLabel={
          ES_IOS
            ? "Selector de fecha y hora"
            : selector === "fecha"
              ? "Selector de fecha"
              : "Selector de hora"
        }
        value={valor ?? fechaInicial()}
        mode={modo}
        display={ES_IOS ? "spinner" : "default"}
        locale="es-CO"
        is24Hour
        onChange={onCambiar}
      />
      {ES_IOS && <BotonFecha etiqueta="Listo" onPress={onCerrar} />}
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
    if (!ES_IOS) {
      setSelector(null);
    }
  }
  return (
    <View style={styles.campo}>
      <ThemedText type="smallBold">Vencimiento</ThemedText>
      <ThemedText accessibilityLabel={`Fecha de vencimiento: ${etiquetaFecha(valor)}`}>
        {etiquetaFecha(valor)}
      </ThemedText>

      <BotonesVencimiento
        valor={valor}
        onAbrir={setSelector}
        onQuitar={() => {
          setSelector(null);
          onCambiar(null);
        }}
      />

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
