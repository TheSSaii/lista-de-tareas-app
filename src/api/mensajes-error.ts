import {
  ErrorApi,
  ErrorConfig,
  ErrorRed,
  ErrorRespuesta,
  ErrorSesionExpirada,
  ErrorTiempo,
} from "./errores";

const MENSAJES_POR_ESTADO: Record<number, string> = {
  400: "Revisa los datos e inténtalo de nuevo.",
  401: "Correo o contraseña incorrectos.",
  409: "Ese correo ya está registrado.",
  429: "Demasiados intentos. Espera un momento.",
  500: "Error interno. Inténtalo más tarde.",
};

const MENSAJES_FIJOS: readonly [new (...args: never[]) => Error, string][] = [
  [ErrorConfig, "Falta configurar el servidor."],
  [ErrorRed, "No se pudo conectar. Revisa tu conexión."],
  [ErrorTiempo, "El servidor tardó demasiado. Inténtalo de nuevo."],
  [ErrorSesionExpirada, "La sesión expiró. Vuelve a iniciar sesión."],
  [ErrorRespuesta, "El servidor devolvió una respuesta inesperada."],
];

export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorApi) {
    return MENSAJES_POR_ESTADO[error.estado] ?? error.message;
  }
  if (error instanceof ErrorConfig) return error.message;

  for (const [Tipo, mensaje] of MENSAJES_FIJOS) {
    if (error instanceof Tipo) return mensaje;
  }

  return "Ocurrió un error inesperado.";
}
