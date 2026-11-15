import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FormularioAuth } from "@/components/formulario-auth";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useEnvioAuth } from "@/components/use-envio-auth";
import { useSesion } from "@/providers/proveedor-sesion";

export default function RegistroScreen() {
  const { registrarse, errorConfig } = useSesion();
  const { cargando, errorGeneral, enviar } = useEnvioAuth(registrarse);

  return (
    <ThemedView style={styles.pantalla}>
      <SafeAreaView style={styles.contenido} edges={["top"]}>
        <ThemedText type="subtitle">Crear cuenta</ThemedText>
        <ThemedText themeColor="textSecondary">
          Usa un correo y una contraseña de al menos 8 caracteres.
        </ThemedText>

        <FormularioAuth
          modo="registro"
          cargando={cargando || errorConfig !== null}
          errorGeneral={errorGeneral ?? errorConfig}
          onEnviar={(valores) => {
            void enviar(valores);
          }}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ir a iniciar sesión"
          onPress={() => {
            router.push("/login" as never);
          }}
        >
          <ThemedText type="linkPrimary">Ya tengo cuenta</ThemedText>
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
