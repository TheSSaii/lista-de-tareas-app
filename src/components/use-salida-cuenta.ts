import { useCallback, useState } from "react";
import { Alert } from "react-native";

export function useSalidaCuenta(pendientes: number, cerrarSesion: () => Promise<void>) {
  const [saliendo, setSaliendo] = useState(false);

  const confirmarSalida = useCallback(() => {
    const mensaje =
      pendientes > 0
        ? `Hay ${pendientes} cambio(s) sin sincronizar. Se borrarán al cerrar sesión.`
        : "También se borrarán las tareas guardadas en este dispositivo.";

    Alert.alert("Cerrar sesión", mensaje, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: () => {
          setSaliendo(true);
          void cerrarSesion().finally(() => {
            setSaliendo(false);
          });
        },
      },
    ]);
  }, [cerrarSesion, pendientes]);

  return { saliendo, confirmarSalida };
}
