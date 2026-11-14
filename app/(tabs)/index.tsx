import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BotonNuevaTarea } from "@/components/boton-nueva-tarea";
import { CuerpoTareas } from "@/components/cuerpo-tareas";
import { EstadoVacio } from "@/components/estado-vacio";
import { FiltroTareas } from "@/components/filtro-tareas";
import { ListaTareas } from "@/components/lista-tareas";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTareas } from "@/providers/proveedor-tareas";
import { agruparPorDia, filtrarTareas } from "@/services/filtros";
import type { Filtro } from "@/services/filtros";

function abrirNuevaTarea() {
  router.push("/tarea/nueva");
}

export default function PendientesScreen() {
  const { tareas, cargando, error, alternar, recargar } = useTareas();
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const pendientes = tareas.filter((tarea) => !tarea.completada);
  const visibles = filtrarTareas(pendientes, filtro);
  const secciones = agruparPorDia(visibles).map((grupo) => ({
    etiqueta: grupo.etiqueta,
    data: grupo.tareas,
  }));

  return (
    <ThemedView style={styles.pantalla}>
      <SafeAreaView style={styles.contenido} edges={["top"]}>
        <ThemedText type="subtitle">Pendientes</ThemedText>
        <FiltroTareas valor={filtro} onCambiar={setFiltro} />

        <CuerpoTareas cargando={cargando} error={error} onReintentar={recargar}>
          {visibles.length === 0 ? (
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
