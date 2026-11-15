import { ErrorApi, ErrorSesionExpirada } from "./errores";
import { solicitarJson, type FetchHttp } from "./http";

export type OpcionesAutenticadas = {
  metodo?: "GET" | "POST" | "PUT" | "DELETE";
  cuerpo?: unknown;
};

export type Solicitar = <T>(ruta: string, opciones?: OpcionesAutenticadas) => Promise<T>;

export type ControlSesion = {
  obtenerToken: () => string | null;
  renovar: () => Promise<string>;
  alExpirar: () => void;
};

export type ContextoCliente = {
  baseUrl: string;
  fetch?: FetchHttp;
  timeoutMs?: number;
  sesion: ControlSesion;
};

function esRespuestaDeSesion(error: unknown): boolean {
  return (
    error instanceof ErrorSesionExpirada ||
    (error instanceof ErrorApi && (error.estado === 401 || error.estado === 400))
  );
}

async function renovarOSalir(sesion: ControlSesion): Promise<string> {
  try {
    return await sesion.renovar();
  } catch (error) {
    if (esRespuestaDeSesion(error)) {
      sesion.alExpirar();
      throw new ErrorSesionExpirada();
    }
    throw error;
  }
}

/**
 * Envuelve las peticiones privadas: ante 401 renueva una sola vez y reintenta
 * una sola vez. El refresh es single-flight en el servicio de sesión.
 */
async function enviarConReintento<T>(
  enviar: (token: string) => Promise<T>,
  sesion: ControlSesion,
  renovar: () => Promise<string>,
): Promise<T> {
  const token = sesion.obtenerToken();
  if (token === null) {
    sesion.alExpirar();
    throw new ErrorSesionExpirada();
  }

  try {
    return await enviar(token);
  } catch (error) {
    if (!(error instanceof ErrorApi) || error.estado !== 401) throw error;

    const renovado = await renovar();
    try {
      return await enviar(renovado);
    } catch (reintento) {
      if (reintento instanceof ErrorApi && reintento.estado === 401) {
        sesion.alExpirar();
        throw new ErrorSesionExpirada();
      }
      throw reintento;
    }
  }
}

export function crearSolicitar(contexto: ContextoCliente): Solicitar {
  let renovacion: Promise<string> | null = null;

  function renovarCompartido(): Promise<string> {
    if (renovacion === null) {
      renovacion = renovarOSalir(contexto.sesion).finally(() => {
        renovacion = null;
      });
    }
    return renovacion;
  }

  return async function solicitar<T>(ruta: string, opciones?: OpcionesAutenticadas): Promise<T> {
    const enviar = (token: string) =>
      solicitarJson<T>({
        baseUrl: contexto.baseUrl,
        ruta,
        ...(opciones?.metodo === undefined ? {} : { metodo: opciones.metodo }),
        ...(opciones?.cuerpo === undefined ? {} : { cuerpo: opciones.cuerpo }),
        token,
        ...(contexto.fetch === undefined ? {} : { fetch: contexto.fetch }),
        ...(contexto.timeoutMs === undefined ? {} : { timeoutMs: contexto.timeoutMs }),
      }).then((respuesta) => respuesta.datos);

    return enviarConReintento(enviar, contexto.sesion, renovarCompartido);
  };
}
