import { router } from "expo-router";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BotonNuevaTarea } from "@/components/boton-nueva-tarea";
import { CuerpoTareas } from "@/components/cuerpo-tareas";
import { EstadoVacio } from "@/components/estado-vacio";
import { ListaTareas } from "@/components/lista-tareas";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTareas } from "@/providers/proveedor-tareas";

function abrirNuevaTarea() {
  router.push("/tarea/nueva");
}

export default function HechasScreen() {
  const { tareas, cargando, error, alternar, recargar } = useTareas();

  const hechas = tareas.filter((tarea) => tarea.completada);
  const secciones = hechas.length === 0 ? [] : [{ etiqueta: "Completadas", data: hechas }];

  return (
    <ThemedView style={styles.pantalla}>
      <SafeAreaView style={styles.contenido} edges={["top"]}>
        <ThemedText type="subtitle">Hechas</ThemedText>

        <CuerpoTareas cargando={cargando} error={error} onReintentar={recargar}>
          {hechas.length === 0 ? (
            <EstadoVacio onNuevaTarea={abrirNuevaTarea} />
          ) : (
            <>
              <ListaTareas secciones={secciones} onAlternar={alternar} />
              <BotonNuevaTarea onPress={abrirNuevaTarea} />
            </>
          )}
        </CuerpoTareas>
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
});
