import { useCallback, useState } from "react";
import { Alert } from "react-native";

import { mensajeDeError } from "@/api/mensajes-error";
import { useSesion } from "@/providers/proveedor-sesion";
import type { ValoresAuth } from "@/services/validacion-auth";

function confirmarPurga(): Promise<boolean> {
  return new Promise((resolver) => {
    Alert.alert(
      "Tareas locales",
      "Estas tareas se borrarán al entrar con tu cuenta. ¿Continuar?",
      [
        { text: "Cancelar", style: "cancel", onPress: () => resolver(false) },
        { text: "Continuar", style: "destructive", onPress: () => resolver(true) },
      ],
      { cancelable: false },
    );
  });
}

export function useEnvioAuth(entrar: (email: string, password: string) => Promise<void>) {
  const { hayTareasLocales } = useSesion();
  const [cargando, setCargando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const enviar = useCallback(
    async (valores: ValoresAuth) => {
      setCargando(true);
      setErrorGeneral(null);
      try {
        if (await hayTareasLocales()) {
          // Se confirma ahora, pero la purga la hace prepararCuenta después de
          // que la autenticación termine bien. Si el login falla, no se borra nada.
          if (!(await confirmarPurga())) return;
        }
        await entrar(valores.email, valores.password);
      } catch (error) {
        setErrorGeneral(mensajeDeError(error));
      } finally {
        setCargando(false);
      }
    },
    [entrar, hayTareasLocales],
  );

  return { cargando, errorGeneral, enviar };
}
