import { useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import { Alert, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BotonVolver } from "@/components/boton-volver";
import { FormularioTarea } from "@/components/formulario-tarea";
import type { ValoresFormulario } from "@/components/formulario-tarea";
import { volver } from "@/components/navegacion";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { entradaDesdeValores, valoresDesdeTarea } from "@/components/valores-tarea";
import { useTareas } from "@/providers/proveedor-tareas";
import type { ErroresTarea, Tarea } from "@/services/tarea";

function Marco({ children }: { children: ReactNode }) {
  return (
    <ThemedView style={styles.pantalla}>
      <SafeAreaView style={styles.contenido} edges={["top"]}>
        {children}
      </SafeAreaView>
    </ThemedView>
  );
}

function NoEncontrada() {
  return (
    <Marco>
      <ThemedText type="subtitle">Tarea no encontrada</ThemedText>
      <ThemedText themeColor="textSecondary">
        La tarea que buscas no existe o ya fue eliminada.
      </ThemedText>
      <BotonVolver />
    </Marco>
  );
}

function BotonEliminar({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Eliminar tarea"
      onPress={onPress}
      style={styles.eliminar}
    >
      <ThemedText type="smallBold" style={styles.textoEliminar}>
        Eliminar tarea
      </ThemedText>
    </Pressable>
  );
}

function useConfirmarEliminar(tarea: Tarea, setErrorGeneral: (mensaje: string) => void) {
  const { eliminar } = useTareas();

  async function borrar() {
    const eliminada = await eliminar(tarea.id);
    if (eliminada) {
      volver();
      return;
    }
    setErrorGeneral("No se pudo eliminar la tarea.");
  }

  return function confirmarEliminar() {
    Alert.alert("Eliminar tarea", `¿Eliminar "${tarea.titulo}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          void borrar();
        },
      },
    ]);
  };
}

function useEdicion(tarea: Tarea) {
  const { actualizar } = useTareas();
  const [valores, setValores] = useState<ValoresFormulario>(() => valoresDesdeTarea(tarea));
  const [errores, setErrores] = useState<ErroresTarea>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function cambiar(cambios: Partial<ValoresFormulario>) {
    setValores((previos) => ({ ...previos, ...cambios }));
    setErrores({});
    setErrorGeneral(null);
  }

  async function guardar() {
    setGuardando(true);
    setErrores({});
    setErrorGeneral(null);
    const resultado = await actualizar(tarea.id, entradaDesdeValores(valores));
    setGuardando(false);

    if (!resultado.ok) {
      setErrores(resultado.errores);
      setErrorGeneral(resultado.error ?? null);
      return;
    }

    volver();
  }

  const confirmarEliminar = useConfirmarEliminar(tarea, setErrorGeneral);

  return { valores, errores, errorGeneral, guardando, cambiar, guardar, confirmarEliminar };
}

function FormularioEdicion({ tarea }: { tarea: Tarea }) {
  const { valores, errores, errorGeneral, guardando, cambiar, guardar, confirmarEliminar } =
    useEdicion(tarea);

  return (
    <Marco>
      <ThemedText type="subtitle">Editar tarea</ThemedText>
      <BotonVolver />

      {errorGeneral !== null && (
        <ThemedText accessibilityRole="alert" style={styles.errorGeneral}>
          {errorGeneral}
        </ThemedText>
      )}

      <FormularioTarea
        valores={valores}
        errores={errores}
        onCambiar={cambiar}
        onGuardar={() => {
          void guardar();
        }}
        guardando={guardando}
      />
      <BotonEliminar onPress={confirmarEliminar} />
    </Marco>
  );
}

export default function EditarTareaScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const { tareas, cargando } = useTareas();

  if (cargando) {
    return (
      <Marco>
        <ThemedText>Cargando…</ThemedText>
      </Marco>
    );
  }

  const tarea = tareas.find((item) => item.id === Number(idParam));
  if (tarea === undefined) {
    return <NoEncontrada />;
  }

  return <FormularioEdicion key={tarea.id} tarea={tarea} />;
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  contenido: {
    flex: 1,
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  errorGeneral: {
    color: "#B42318",
  },
  eliminar: {
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#B42318",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textoEliminar: {
    color: "#B42318",
  },
});
