import { Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BotonVolver } from "@/components/boton-volver";
import { EstadoSincronizacion } from "@/components/estado-sincronizacion";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useSalidaCuenta } from "@/components/use-salida-cuenta";
import { useSesion } from "@/providers/proveedor-sesion";
import { useTareas } from "@/providers/proveedor-tareas";

function fechaLegible(valor: string | null): string {
  if (valor === null) return "Todavía no se ha sincronizado.";
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime())
    ? "Todavía no se ha sincronizado."
    : `Última sincronización: ${fecha.toLocaleString("es-CO")}`;
}

function ContenidoCuenta() {
  const { usuario, cerrarSesion } = useSesion();
  const { estadoSync, pendientesSync, ultimaSync, sincronizar } = useTareas();
  const { saliendo, confirmarSalida } = useSalidaCuenta(pendientesSync, cerrarSesion);

  return (
    <SafeAreaView style={styles.contenido} edges={["top"]}>
      <ThemedText type="subtitle">Cuenta</ThemedText>
      <BotonVolver />
      <ThemedText>{usuario?.email ?? "Sin sesión"}</ThemedText>
      <ThemedText themeColor="textSecondary" type="small">
        {fechaLegible(ultimaSync)}
      </ThemedText>

      <EstadoSincronizacion
        estado={estadoSync}
        pendientes={pendientesSync}
        onSincronizar={() => {
          void sincronizar();
        }}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
        accessibilityState={{ disabled: saliendo }}
        disabled={saliendo}
        onPress={confirmarSalida}
        style={styles.cerrar}
      >
        <ThemedText type="smallBold" style={styles.textoCerrar}>
          {saliendo ? "Cerrando…" : "Cerrar sesión"}
        </ThemedText>
      </Pressable>
    </SafeAreaView>
  );
}

export default function CuentaScreen() {
  return (
    <ThemedView style={styles.pantalla}>
      <ContenidoCuenta />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  contenido: {
    flex: 1,
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  cerrar: {
    alignItems: "center",
    borderColor: "#B42318",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textoCerrar: {
    color: "#B42318",
  },
});
