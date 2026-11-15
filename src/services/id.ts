import { randomUUID } from "expo-crypto";

/** Envoltorio de `expo-crypto` para inyectar un generador determinista en pruebas. */
export function nuevoId(): string {
  return randomUUID();
}

export type GeneradorId = () => string;
