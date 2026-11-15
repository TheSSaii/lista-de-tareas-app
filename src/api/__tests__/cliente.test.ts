import { describe, expect, it, jest } from "@jest/globals";

import { crearFetchFalso } from "../../testing/fetch-falso";
import { crearSolicitar, type ControlSesion } from "../cliente";
import { ErrorRed, ErrorSesionExpirada } from "../errores";

const BASE = "https://api.example.test";

function control(renovar: ControlSesion["renovar"]): ControlSesion {
  return {
    obtenerToken: () => "token-viejo",
    renovar,
    alExpirar: jest.fn(),
  };
}

describe("crearSolicitar", () => {
  it("ante 401 renueva una vez y reintenta con el token nuevo", async () => {
    const falso = crearFetchFalso([
      { status: 401, cuerpo: { error: "Token vencido." } },
      { status: 200, cuerpo: { ok: true } },
    ]);
    const sesion = control(jest.fn(async () => "token-nuevo"));
    const solicitar = crearSolicitar({ baseUrl: BASE, fetch: falso.fetch, sesion });

    const datos = await solicitar<{ ok: boolean }>("/api/tareas");

    expect(datos).toEqual({ ok: true });
    expect(sesion.renovar).toHaveBeenCalledTimes(1);
    expect(falso.peticiones).toHaveLength(2);
    expect(falso.peticiones[0]?.init.headers.Authorization).toBe("Bearer token-viejo");
    expect(falso.peticiones[1]?.init.headers.Authorization).toBe("Bearer token-nuevo");
  });

  it("dos 401 simultáneos comparten una sola renovación", async () => {
    const falso = crearFetchFalso([
      { status: 401, cuerpo: { error: "Token vencido." } },
      { status: 401, cuerpo: { error: "Token vencido." } },
      { status: 200, cuerpo: { ok: 1 } },
      { status: 200, cuerpo: { ok: 2 } },
    ]);
    let resolver: (token: string) => void = () => undefined;
    const promesa = new Promise<string>((resolverPromesa) => {
      resolver = resolverPromesa;
    });
    const renovar = jest.fn(() => promesa);
    const sesion = control(renovar);
    const solicitar = crearSolicitar({ baseUrl: BASE, fetch: falso.fetch, sesion });

    const primera = solicitar<{ ok: number }>("/api/tareas");
    const segunda = solicitar<{ ok: number }>("/api/tareas");
    resolver("token-nuevo");

    await Promise.all([primera, segunda]);
    expect(renovar).toHaveBeenCalledTimes(1);
  });
});

describe("crearSolicitar: expiración y red", () => {
  it("si el reintento vuelve a dar 401 expira la sesión", async () => {
    const falso = crearFetchFalso([
      { status: 401, cuerpo: { error: "Token vencido." } },
      { status: 401, cuerpo: { error: "Token vencido." } },
    ]);
    const sesion = control(jest.fn(async () => "token-nuevo"));
    const solicitar = crearSolicitar({ baseUrl: BASE, fetch: falso.fetch, sesion });

    await expect(solicitar("/api/tareas")).rejects.toBeInstanceOf(ErrorSesionExpirada);
    expect(sesion.alExpirar).toHaveBeenCalled();
  });

  it("un error de red al renovar no cierra la sesión", async () => {
    const falso = crearFetchFalso([{ status: 401, cuerpo: { error: "Token vencido." } }]);
    const sesion = control(
      jest.fn(async () => {
        throw new ErrorRed();
      }),
    );
    const solicitar = crearSolicitar({ baseUrl: BASE, fetch: falso.fetch, sesion });

    await expect(solicitar("/api/tareas")).rejects.toBeInstanceOf(ErrorRed);
    expect(sesion.alExpirar).not.toHaveBeenCalled();
  });

  it("sin token lanza sesión expirada sin llamar a la red", async () => {
    const falso = crearFetchFalso();
    const sesion: ControlSesion = {
      obtenerToken: () => null,
      renovar: jest.fn(async () => "token-nuevo"),
      alExpirar: jest.fn(),
    };
    const solicitar = crearSolicitar({ baseUrl: BASE, fetch: falso.fetch, sesion });

    await expect(solicitar("/api/tareas")).rejects.toBeInstanceOf(ErrorSesionExpirada);
    expect(falso.peticiones).toHaveLength(0);
  });
});

describe("crearSolicitar: otros fallos", () => {
  it("si el refresh dice sesión expirada, la cierra", async () => {
    const falso = crearFetchFalso([{ status: 401, cuerpo: { error: "x" } }]);
    const sesion = control(
      jest.fn(async () => {
        throw new ErrorSesionExpirada();
      }),
    );
    const solicitar = crearSolicitar({ baseUrl: BASE, fetch: falso.fetch, sesion });

    await expect(solicitar("/api/tareas")).rejects.toBeInstanceOf(ErrorSesionExpirada);
    expect(sesion.alExpirar).toHaveBeenCalled();
  });

  it("un error no 401 no intenta renovar", async () => {
    const falso = crearFetchFalso([{ status: 400, cuerpo: { error: "Datos inválidos." } }]);
    const sesion = control(jest.fn(async () => "token-nuevo"));
    const solicitar = crearSolicitar({ baseUrl: BASE, fetch: falso.fetch, sesion });

    await expect(solicitar("/api/tareas")).rejects.toMatchObject({ estado: 400 });
    expect(sesion.renovar).not.toHaveBeenCalled();
  });

  it("un error de red en el reintento se propaga sin cerrar sesión", async () => {
    const falso = crearFetchFalso([{ status: 401, cuerpo: { error: "x" } }, { errorRed: true }]);
    const sesion = control(jest.fn(async () => "token-nuevo"));
    const solicitar = crearSolicitar({ baseUrl: BASE, fetch: falso.fetch, sesion });

    await expect(solicitar("/api/tareas")).rejects.toBeInstanceOf(ErrorRed);
    expect(sesion.alExpirar).not.toHaveBeenCalled();
  });
});
