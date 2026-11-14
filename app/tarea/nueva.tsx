import { useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BotonVolver } from "@/components/boton-volver";
import { FormularioTarea } from "@/components/formulario-tarea";
import type { ValoresFormulario } from "@/components/formulario-tarea";
import { volver } from "@/components/navegacion";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { entradaDesdeValores, valoresIniciales } from "@/components/valores-tarea";
import { useTareas } from "@/providers/proveedor-tareas";
import type { ErroresTarea } from "@/services/tarea";

function useCreacion() {
  const { crear } = useTareas();
  const [valores, setValores] = useState<ValoresFormulario>(valoresIniciales);
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
    const resultado = await crear(entradaDesdeValores(valores));
    setGuardando(false);

    if (!resultado.ok) {
      setErrores(resultado.errores);
      setErrorGeneral(resultado.error ?? null);
      return;
    }

    volver();
  }

  return { valores, errores, errorGeneral, guardando, cambiar, guardar };
}

export default function NuevaTareaScreen() {
  const { valores, errores, errorGeneral, guardando, cambiar, guardar } = useCreacion();

  return (
    <ThemedView style={styles.pantalla}>
      <SafeAreaView style={styles.contenido} edges={["top"]}>
        <ThemedText type="subtitle">Nueva tarea</ThemedText>
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
      </SafeAreaView>
    </ThemedView>
  );
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
});
