import { ErrorConfig } from "./errores";

export type ConfigApi = {
  baseUrl: string;
};

const LOCALHOST = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Lee `EXPO_PUBLIC_API_URL` sin exponer secretos. En producción exige HTTPS y
 * rechaza localhost; en desarrollo permite un servidor local por HTTP.
 */
export function normalizarBaseUrl(valor: string | undefined): string {
  const limpio = valor?.trim() ?? "";
  if (limpio === "") {
    throw new ErrorConfig("Falta configurar EXPO_PUBLIC_API_URL.");
  }

  let url: URL;
  try {
    url = new URL(limpio);
  } catch {
    throw new ErrorConfig("EXPO_PUBLIC_API_URL no es una URL válida.");
  }

  const esDesarrollo = process.env.NODE_ENV !== "production";
  const esLocal = LOCALHOST.has(url.hostname);

  if (url.protocol !== "https:" && !(esDesarrollo && esLocal)) {
    throw new ErrorConfig("EXPO_PUBLIC_API_URL debe usar HTTPS.");
  }

  if (!esDesarrollo && esLocal) {
    throw new ErrorConfig("EXPO_PUBLIC_API_URL no puede apuntar a localhost.");
  }

  return url.toString().replace(/\/+$/, "");
}

/** Devuelve `null` si la configuración falta o es inválida; la app sigue abriendo. */
export function leerConfigApi(
  valor: string | undefined = process.env.EXPO_PUBLIC_API_URL,
): ConfigApi | null {
  try {
    return { baseUrl: normalizarBaseUrl(valor) };
  } catch {
    return null;
  }
}
