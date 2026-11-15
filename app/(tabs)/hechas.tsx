import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BarraDeshacer } from "@/components/barra-deshacer";
import { BotonCuenta } from "@/components/boton-cuenta";
import { BotonNuevaTarea } from "@/components/boton-nueva-tarea";
import { CuerpoTareas } from "@/components/cuerpo-tareas";
import { EstadoVacio } from "@/components/estado-vacio";
import { ListaTareas } from "@/components/lista-tareas";
import { abrirEdicionTarea } from "@/components/navegacion";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTareas } from "@/providers/proveedor-tareas";

function abrirNuevaTarea() {
  router.push("/tarea/nueva");
}

export default function HechasScreen() {
  const { tareas, cargando, error, alternar, posponer, deshacer, puedeDeshacer, recargar } =
    useTareas();

  const hechas = tareas.filter((tarea) => tarea.completada);
  const secciones = hechas.length === 0 ? [] : [{ etiqueta: "Completadas", data: hechas }];

  return (
    <ThemedView style={styles.pantalla}>
      <SafeAreaView style={styles.contenido} edges={["top"]}>
        <View style={styles.encabezado}>
          <ThemedText type="subtitle">Hechas</ThemedText>
          <BotonCuenta />
          <BarraDeshacer puedeDeshacer={puedeDeshacer} onDeshacer={deshacer} />
        </View>

        <CuerpoTareas cargando={cargando} error={error} onReintentar={recargar}>
          {hechas.length === 0 ? (
            <EstadoVacio mensaje="No hay tareas completadas" />
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
