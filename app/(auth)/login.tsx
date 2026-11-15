import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FormularioAuth } from "@/components/formulario-auth";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useEnvioAuth } from "@/components/use-envio-auth";
import { useSesion } from "@/providers/proveedor-sesion";

export default function LoginScreen() {
  const { iniciarSesion, errorConfig } = useSesion();
  const { cargando, errorGeneral, enviar } = useEnvioAuth(iniciarSesion);

  return (
    <ThemedView style={styles.pantalla}>
      <SafeAreaView style={styles.contenido} edges={["top"]}>
        <ThemedText type="subtitle">Iniciar sesión</ThemedText>
        <ThemedText themeColor="textSecondary">
          Tus tareas se guardan en este dispositivo y se sincronizan con tu cuenta.
        </ThemedText>

        <FormularioAuth
          modo="login"
          cargando={cargando || errorConfig !== null}
          errorGeneral={errorGeneral ?? errorConfig}
          onEnviar={(valores) => {
            void enviar(valores);
          }}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ir a crear cuenta"
          onPress={() => {
            router.push("/registro" as never);
          }}
        >
          <ThemedText type="linkPrimary">Crear una cuenta</ThemedText>
        </Pressable>
      </SafeAreaView>
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
});
