import {
  ErrorApi,
  ErrorRed,
  ErrorRespuesta,
  ErrorTiempo,
  esDetalleError,
  type DetalleError,
} from "./errores";

export type PeticionHttp = {
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
};

export type RespuestaHttp = {
  status: number;
  text: () => Promise<string>;
};

export type FetchHttp = (url: string, init: PeticionHttp) => Promise<RespuestaHttp>;

export type OpcionesSolicitud = {
  baseUrl: string;
  ruta: string;
  metodo?: "GET" | "POST" | "PUT" | "DELETE";
  cuerpo?: unknown;
  token?: string;
  fetch?: FetchHttp;
  timeoutMs?: number;
};

export type RespuestaJson<T> = {
  estado: number;
  datos: T;
};

export const TIMEOUT_POR_DEFECTO = 10_000;

const fetchGlobal: FetchHttp = (url, init) => fetch(url, init);

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

function leerDetalles(valor: unknown): DetalleError[] {
  return Array.isArray(valor) ? valor.filter(esDetalleError) : [];
}

function mensajeDeError(estado: number, cuerpo: unknown): string {
  if (estado === 500) return "Error interno.";
  if (esObjeto(cuerpo) && typeof cuerpo.error === "string" && cuerpo.error.trim() !== "") {
    return cuerpo.error;
  }
  return `Error HTTP ${estado}.`;
}

function parsearJson(texto: string): { valido: boolean; cuerpo: unknown } {
  if (texto.trim() === "") return { valido: true, cuerpo: undefined };
  try {
    return { valido: true, cuerpo: JSON.parse(texto) as unknown };
  } catch {
    return { valido: false, cuerpo: undefined };
  }
}

async function ejecutarFetch(
  url: string,
  init: PeticionHttp,
  timeoutMs: number,
  fetchFn: FetchHttp,
): Promise<RespuestaHttp> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => {
    controlador.abort();
  }, timeoutMs);

  try {
    return await fetchFn(url, { ...init, signal: controlador.signal });
  } catch {
    if (controlador.signal.aborted) throw new ErrorTiempo();
    throw new ErrorRed();
  } finally {
    clearTimeout(temporizador);
  }
}

/**
 * Única puerta HTTP de la app. Normaliza el error del contrato
 * `{ error, detalles? }` y nunca deja escapar un error crudo de JSON o red.
 */
export async function solicitarJson<T>(opciones: OpcionesSolicitud): Promise<RespuestaJson<T>> {
  const metodo = opciones.metodo ?? "GET";
  const cabeceras: Record<string, string> = { Accept: "application/json" };

  if (opciones.cuerpo !== undefined) {
    cabeceras["Content-Type"] = "application/json";
  }
  if (opciones.token !== undefined) {
    cabeceras.Authorization = `Bearer ${opciones.token}`;
  }

  const respuesta = await ejecutarFetch(
    `${opciones.baseUrl}${opciones.ruta}`,
    {
      method: metodo,
      headers: cabeceras,
      ...(opciones.cuerpo === undefined ? {} : { body: JSON.stringify(opciones.cuerpo) }),
    },
    opciones.timeoutMs ?? TIMEOUT_POR_DEFECTO,
    opciones.fetch ?? fetchGlobal,
  );

  let texto: string;
  try {
    texto = await respuesta.text();
  } catch {
    throw new ErrorRed();
  }

  return procesarRespuesta<T>(respuesta.status, texto);
}

function procesarRespuesta<T>(estado: number, texto: string): RespuestaJson<T> {
  const parseado = parsearJson(texto);
  if (estado < 200 || estado >= 300) {
    const detalles =
      estado === 500
        ? []
        : leerDetalles(esObjeto(parseado.cuerpo) ? parseado.cuerpo.detalles : undefined);
    throw new ErrorApi(estado, mensajeDeError(estado, parseado.cuerpo), detalles);
  }
  if (!parseado.valido) throw new ErrorRespuesta();
  return { estado, datos: parseado.cuerpo as T };
}
