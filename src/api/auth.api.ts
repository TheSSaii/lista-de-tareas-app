import { ErrorRespuesta } from "./errores";
import { solicitarJson, type FetchHttp } from "./http";
import type { SesionRemota, Usuario } from "../services/tipos-sesion";

export type ContextoApi = {
  baseUrl: string;
  fetch?: FetchHttp;
  timeoutMs?: number;
};

export type SesionConUsuario = SesionRemota & {
  usuario: Usuario;
};

export type AuthApi = {
  registro: (email: string, password: string) => Promise<SesionConUsuario>;
  login: (email: string, password: string) => Promise<SesionConUsuario>;
  refresh: (refreshToken: string) => Promise<SesionRemota>;
  yo: (token: string) => Promise<Usuario>;
};

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

function leerUsuario(valor: unknown): Usuario {
  if (!esObjeto(valor)) throw new ErrorRespuesta();
  if (typeof valor.id !== "string" || typeof valor.email !== "string") {
    throw new ErrorRespuesta();
  }
  return { id: valor.id, email: valor.email };
}

function leerSesionRemota(valor: unknown): SesionRemota {
  if (!esObjeto(valor)) throw new ErrorRespuesta();
  if (
    typeof valor.token !== "string" ||
    valor.token === "" ||
    typeof valor.refreshToken !== "string" ||
    valor.refreshToken === "" ||
    typeof valor.expiraEnSeg !== "number" ||
    !Number.isFinite(valor.expiraEnSeg) ||
    valor.expiraEnSeg <= 0
  ) {
    throw new ErrorRespuesta();
  }

  return {
    token: valor.token,
    refreshToken: valor.refreshToken,
    expiraEnSeg: valor.expiraEnSeg,
  };
}

function leerSesionConUsuario(valor: unknown): SesionConUsuario {
  const remota = leerSesionRemota(valor);
  if (!esObjeto(valor)) throw new ErrorRespuesta();
  return { ...remota, usuario: leerUsuario(valor.usuario) };
}

export function crearAuthApi(contexto: ContextoApi): AuthApi {
  const solicitar = <T>(ruta: string, metodo: "GET" | "POST", cuerpo?: unknown) =>
    solicitarJson<T>({
      baseUrl: contexto.baseUrl,
      ruta,
      metodo,
      cuerpo,
      ...(contexto.fetch === undefined ? {} : { fetch: contexto.fetch }),
      ...(contexto.timeoutMs === undefined ? {} : { timeoutMs: contexto.timeoutMs }),
    }).then((respuesta) => respuesta.datos);

  async function entrar(ruta: string, email: string, password: string): Promise<SesionConUsuario> {
    return leerSesionConUsuario(await solicitar<unknown>(ruta, "POST", { email, password }));
  }

  return {
    registro: (email, password) => entrar("/api/auth/registro", email, password),
    login: (email, password) => entrar("/api/auth/login", email, password),
    async refresh(refreshToken) {
      return leerSesionRemota(
        await solicitar<unknown>("/api/auth/refresh", "POST", { refreshToken }),
      );
    },
    async yo(token) {
      const datos = await solicitarJson<unknown>({
        baseUrl: contexto.baseUrl,
        ruta: "/api/auth/yo",
        token,
        ...(contexto.fetch === undefined ? {} : { fetch: contexto.fetch }),
        ...(contexto.timeoutMs === undefined ? {} : { timeoutMs: contexto.timeoutMs }),
      });
      if (!esObjeto(datos.datos)) throw new ErrorRespuesta();
      return leerUsuario(datos.datos.usuario);
    },
  };
}
