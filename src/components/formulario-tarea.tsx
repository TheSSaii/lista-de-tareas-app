import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { useTheme } from "../hooks/use-theme";
import type { ErroresTarea } from "../services/tarea";
import { CampoFecha } from "./campo-fecha";
import { ThemedText } from "./themed-text";
import type { ValoresFormulario } from "./valores-tarea";

export type { ValoresFormulario } from "./valores-tarea";

type Props = {
  valores: ValoresFormulario;
  errores: ErroresTarea;
  onCambiar: (cambios: Partial<ValoresFormulario>) => void;
  onGuardar: () => void;
  guardando: boolean;
};

const PRIORIDADES = [
  { valor: 1, etiqueta: "Alta" },
  { valor: 2, etiqueta: "Media" },
  { valor: 3, etiqueta: "Baja" },
] as const;

function MensajeError({ mensaje }: { mensaje?: string }) {
  if (mensaje === undefined) {
    return null;
  }

  return (
    <ThemedText accessibilityRole="alert" style={styles.error}>
      {mensaje}
    </ThemedText>
  );
}

type CampoTextoProps = {
  etiqueta: string;
  valor: string;
  onCambiar: (texto: string) => void;
  error?: string;
  multilinea?: boolean;
};

function CampoTexto({ etiqueta, valor, onCambiar, error, multilinea }: CampoTextoProps) {
  const tema = useTheme();

  return (
    <View style={styles.campo}>
      <ThemedText type="smallBold">{etiqueta}</ThemedText>
      <TextInput
        accessibilityLabel={etiqueta}
        value={valor}
        onChangeText={onCambiar}
        multiline={multilinea}
        textAlignVertical={multilinea === true ? "top" : "center"}
        placeholderTextColor={tema.textSecondary}
        style={[
          styles.entrada,
          multilinea === true && styles.entradaMultilinea,
          { borderColor: tema.textSecondary, color: tema.text },
        ]}
      />
      <MensajeError mensaje={error} />
    </View>
  );
}

type CampoPrioridadProps = {
  valor: number | null;
  onCambiar: (prioridad: number) => void;
  error?: string;
};

function CampoPrioridad({ valor, onCambiar, error }: CampoPrioridadProps) {
  const tema = useTheme();

  return (
    <View style={styles.campo}>
      <ThemedText type="smallBold">Prioridad</ThemedText>
      <View style={styles.prioridades}>
        {PRIORIDADES.map((prioridad) => {
          const seleccionada = valor === prioridad.valor;

          return (
            <Pressable
              key={prioridad.valor}
              accessibilityRole="button"
              accessibilityLabel={`Prioridad ${prioridad.etiqueta.toLowerCase()}`}
              accessibilityState={{ selected: seleccionada }}
              onPress={() => onCambiar(prioridad.valor)}
              style={[
                styles.prioridad,
                { borderColor: tema.textSecondary },
                seleccionada && { backgroundColor: tema.backgroundSelected },
              ]}
            >
              <ThemedText type="smallBold">{prioridad.etiqueta}</ThemedText>
            </Pressable>
          );
        })}
      </View>
      <MensajeError mensaje={error} />
    </View>
  );
}

function BotonGuardar({ guardando, onPress }: { guardando: boolean; onPress: () => void }) {
  const tema = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Guardar tarea"
      accessibilityState={{ disabled: guardando }}
      disabled={guardando}
      onPress={onPress}
      style={[
        styles.guardar,
        { backgroundColor: tema.backgroundSelected },
        guardando && styles.deshabilitado,
      ]}
    >
      <ThemedText type="smallBold">{guardando ? "Guardando…" : "Guardar tarea"}</ThemedText>
    </Pressable>
  );
}

export function FormularioTarea({ valores, errores, onCambiar, onGuardar, guardando }: Props) {
  return (
    <View style={styles.formulario}>
      <CampoTexto
        etiqueta="Título"
        valor={valores.titulo}
        onCambiar={(titulo) => onCambiar({ titulo })}
        error={errores.titulo}
      />
      <CampoTexto
        etiqueta="Descripción"
        valor={valores.descripcion}
        onCambiar={(descripcion) => onCambiar({ descripcion })}
        multilinea
      />
      <CampoPrioridad
        valor={valores.prioridad}
        onCambiar={(prioridad) => onCambiar({ prioridad })}
        error={errores.prioridad}
      />
      <CampoFecha
        valor={valores.venceEn}
        onCambiar={(venceEn) => onCambiar({ venceEn })}
        error={errores.vence_en}
      />
      <BotonGuardar guardando={guardando} onPress={onGuardar} />
    </View>
  );
}

const styles = StyleSheet.create({
  formulario: {
    gap: 16,
  },
  campo: {
    gap: 8,
  },
  entrada: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  entradaMultilinea: {
    minHeight: 88,
  },
  prioridades: {
    flexDirection: "row",
    gap: 8,
  },
  prioridad: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  guardar: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  deshabilitado: {
    opacity: 0.6,
  },
  error: {
    color: "#B42318",
  },
});
