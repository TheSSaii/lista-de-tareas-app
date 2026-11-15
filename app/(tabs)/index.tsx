import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BarraDeshacer } from "@/components/barra-deshacer";
import { BotonNuevaTarea } from "@/components/boton-nueva-tarea";
import { ControlSacudida } from "@/components/control-sacudida";
import { CuerpoTareas } from "@/components/cuerpo-tareas";
import { EstadoVacio } from "@/components/estado-vacio";
import { FiltroTareas } from "@/components/filtro-tareas";
import { ListaTareas } from "@/components/lista-tareas";
import { abrirEdicionTarea } from "@/components/navegacion";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTareas } from "@/providers/proveedor-tareas";
import { useSacudida } from "@/sensors/use-sacudida";
import { agruparPorDia, filtrarTareas } from "@/services/filtros";
import type { Filtro } from "@/services/filtros";

function abrirNuevaTarea() {
  router.push("/tarea/nueva");
}

export default function PendientesScreen() {
  const { tareas, cargando, error, alternar, posponer, deshacer, puedeDeshacer, recargar } =
    useTareas();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [agitarActivo, setAgitarActivo] = useState(false);
  const { estado: estadoSacudida } = useSacudida(agitarActivo, deshacer);

  const pendientes = tareas.filter((tarea) => !tarea.completada);
  const visibles = filtrarTareas(pendientes, filtro);
  const secciones = agruparPorDia(visibles).map((grupo) => ({
    etiqueta: grupo.etiqueta,
    data: grupo.tareas,
  }));
  const mensajeVacio =
    pendientes.length === 0 ? "No hay tareas todavía" : "No hay tareas en este filtro";

  return (
    <ThemedView style={styles.pantalla}>
      <SafeAreaView style={styles.contenido} edges={["top"]}>
        <View style={styles.encabezado}>
          <ThemedText type="subtitle">Pendientes</ThemedText>
          <BarraDeshacer puedeDeshacer={puedeDeshacer} onDeshacer={deshacer} />
        </View>
        <FiltroTareas valor={filtro} onCambiar={setFiltro} />
        <ControlSacudida
          activo={agitarActivo}
          estado={estadoSacudida}
          onCambiar={setAgitarActivo}
        />

        <CuerpoTareas cargando={cargando} error={error} onReintentar={recargar}>
          {visibles.length === 0 ? (
            <EstadoVacio mensaje={mensajeVacio} onNuevaTarea={abrirNuevaTarea} />
          ) : (
            <>
              <ListaTareas
                secciones={secciones}
                onAlternar={alternar}
                onPosponer={posponer}
                onEditar={(tarea) => abrirEdicionTarea(tarea.id)}
              />
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
  encabezado: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
});
