import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { validarAuth, type ErroresAuth, type ValoresAuth } from "@/services/validacion-auth";
import { ThemedText } from "./themed-text";

type Props = {
  modo: "login" | "registro";
  cargando: boolean;
  errorGeneral: string | null;
  onEnviar: (valores: ValoresAuth) => void;
};

type CampoProps = {
  etiqueta: string;
  valor: string;
  error: string | undefined;
  seguro?: boolean;
  tipoTeclado?: "default" | "email-address";
  onCambiar: (valor: string) => void;
};

const VACIOS: ValoresAuth = { email: "", password: "" };

function CampoAuth({ etiqueta, valor, error, seguro, tipoTeclado, onCambiar }: CampoProps) {
  const tema = useTheme();

  return (
    <View style={styles.campo}>
      <ThemedText type="smallBold">{etiqueta}</ThemedText>
      <TextInput
        accessibilityLabel={etiqueta}
        autoCapitalize="none"
        keyboardType={tipoTeclado ?? "default"}
        onChangeText={onCambiar}
        secureTextEntry={seguro ?? false}
        style={[styles.entrada, { borderColor: tema.backgroundSelected, color: tema.text }]}
        value={valor}
      />
      {error !== undefined && (
        <ThemedText accessibilityRole="alert" style={styles.error}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

function AccionesAuth({
  etiqueta,
  cargando,
  errorGeneral,
  onEnviar,
}: {
  etiqueta: string;
  cargando: boolean;
  errorGeneral: string | null;
  onEnviar: () => void;
}) {
  return (
    <>
      {errorGeneral !== null && (
        <ThemedText accessibilityRole="alert" style={styles.error}>
          {errorGeneral}
        </ThemedText>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={etiqueta}
        accessibilityState={{ disabled: cargando }}
        disabled={cargando}
        onPress={onEnviar}
        style={[styles.boton, cargando ? styles.botonDeshabilitado : null]}
      >
        <ThemedText type="smallBold" style={styles.textoBoton}>
          {cargando ? "Espera…" : etiqueta}
        </ThemedText>
      </Pressable>
    </>
  );
}

export function FormularioAuth({ modo, cargando, errorGeneral, onEnviar }: Props) {
  const [valores, setValores] = useState<ValoresAuth>(VACIOS);
  const [errores, setErrores] = useState<ErroresAuth>({});

  function cambiar(cambios: Partial<ValoresAuth>) {
    setValores((previos) => ({ ...previos, ...cambios }));
    setErrores({});
  }

  function enviar() {
    const nuevos = validarAuth(valores);
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    onEnviar({ email: valores.email.trim(), password: valores.password });
  }

  const etiqueta = modo === "login" ? "Iniciar sesión" : "Crear cuenta";

  return (
    <View style={styles.formulario}>
      <CampoAuth
        etiqueta="Correo electrónico"
        valor={valores.email}
        error={errores.email}
        tipoTeclado="email-address"
        onCambiar={(email) => {
          cambiar({ email });
        }}
      />
      <CampoAuth
        etiqueta="Contraseña"
        valor={valores.password}
        error={errores.password}
        seguro
        onCambiar={(password) => {
          cambiar({ password });
        }}
      />
      <AccionesAuth
        etiqueta={etiqueta}
        cargando={cargando}
        errorGeneral={errorGeneral}
        onEnviar={enviar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  formulario: { gap: 16 },
  campo: { gap: 6 },
  entrada: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: { color: "#B42318" },
  boton: {
    alignItems: "center",
    backgroundColor: "#208AEF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  botonDeshabilitado: { opacity: 0.6 },
  textoBoton: { color: "#FFFFFF" },
});
