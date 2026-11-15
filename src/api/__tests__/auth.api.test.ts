import { describe, expect, it } from "@jest/globals";

import { crearFetchFalso } from "../../testing/fetch-falso";
import { ErrorApi, ErrorRespuesta } from "../errores";
import { crearAuthApi } from "../auth.api";

const BASE = "https://api.example.test";

const SESION = {
  token: "token-1",
  refreshToken: "refresh-1",
  expiraEnSeg: 3600,
  usuario: { id: "uid-1", email: "persona@ejemplo.test" },
};

describe("crearAuthApi", () => {
  it("registra con POST y devuelve la sesión validada", async () => {
    const falso = crearFetchFalso([{ status: 201, cuerpo: SESION }]);
    const api = crearAuthApi({ baseUrl: BASE, fetch: falso.fetch });

    const sesion = await api.registro("persona@ejemplo.test", "contrasena-larga");

    expect(sesion).toEqual(SESION);
    expect(falso.peticiones[0]?.url).toBe(`${BASE}/api/auth/registro`);
    expect(falso.peticiones[0]?.init.method).toBe("POST");
    expect(JSON.parse(falso.peticiones[0]?.init.body ?? "{}")).toEqual({
      email: "persona@ejemplo.test",
      password: "contrasena-larga",
    });
  });
});

describe("crearAuthApi: errores y renovación", () => {
  it("login propaga el 401 con el mensaje genérico de la API", async () => {
    const falso = crearFetchFalso([
      { status: 401, cuerpo: { error: "Correo o contraseña incorrectos." } },
    ]);
    const api = crearAuthApi({ baseUrl: BASE, fetch: falso.fetch });

    await expect(api.login("persona@ejemplo.test", "mala")).rejects.toMatchObject({
      estado: 401,
      message: "Correo o contraseña incorrectos.",
    });
  });

  it("renueva con el refreshToken y devuelve el token rotado", async () => {
    const falso = crearFetchFalso([
      {
        status: 200,
        cuerpo: { token: "token-2", refreshToken: "refresh-2", expiraEnSeg: 3600 },
      },
    ]);
    const api = crearAuthApi({ baseUrl: BASE, fetch: falso.fetch });

    const renovada = await api.refresh("refresh-1");

    expect(renovada.refreshToken).toBe("refresh-2");
    expect(JSON.parse(falso.peticiones[0]?.init.body ?? "{}")).toEqual({
      refreshToken: "refresh-1",
    });
  });
});

describe("crearAuthApi: yo y validación", () => {
  it("yo envía Bearer y devuelve el usuario", async () => {
    const falso = crearFetchFalso([
      { status: 200, cuerpo: { usuario: { id: "uid-1", email: "persona@ejemplo.test" } } },
    ]);
    const api = crearAuthApi({ baseUrl: BASE, fetch: falso.fetch });

    const usuario = await api.yo("token-1");

    expect(usuario.email).toBe("persona@ejemplo.test");
    expect(falso.peticiones[0]?.init.headers.Authorization).toBe("Bearer token-1");
  });

  it("rechaza una respuesta 200 con forma inválida", async () => {
    const falso = crearFetchFalso([{ status: 200, cuerpo: { token: 1 } }]);
    const api = crearAuthApi({ baseUrl: BASE, fetch: falso.fetch });

    await expect(api.login("persona@ejemplo.test", "contrasena-larga")).rejects.toBeInstanceOf(
      ErrorRespuesta,
    );
  });

  it("conserva el estado y los detalles de un 400", async () => {
    const falso = crearFetchFalso([
      {
        status: 400,
        cuerpo: {
          error: "Datos inválidos.",
          detalles: [{ campo: "password", mensaje: "Mínimo 8 caracteres." }],
        },
      },
    ]);
    const api = crearAuthApi({ baseUrl: BASE, fetch: falso.fetch });

    const error = await api.registro("persona@ejemplo.test", "corta").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect((error as ErrorApi).detalles).toEqual([
      { campo: "password", mensaje: "Mínimo 8 caracteres." },
    ]);
  });
});

describe("crearAuthApi: respuestas incompletas", () => {
  it("rechaza token vacío y expiración inválida en refresh", async () => {
    const falso = crearFetchFalso([
      { status: 200, cuerpo: { token: "", refreshToken: "r", expiraEnSeg: 3600 } },
      { status: 200, cuerpo: { token: "t", refreshToken: "r", expiraEnSeg: 0 } },
    ]);
    const api = crearAuthApi({ baseUrl: BASE, fetch: falso.fetch });

    await expect(api.refresh("r")).rejects.toBeInstanceOf(ErrorRespuesta);
    await expect(api.refresh("r")).rejects.toBeInstanceOf(ErrorRespuesta);
  });

  it("rechaza un usuario sin email y un /yo sin usuario", async () => {
    const falso = crearFetchFalso([
      {
        status: 200,
        cuerpo: {
          token: "t",
          refreshToken: "r",
          expiraEnSeg: 3600,
          usuario: { id: "uid-1" },
        },
      },
      { status: 200, cuerpo: {} },
    ]);
    const api = crearAuthApi({ baseUrl: BASE, fetch: falso.fetch });

    await expect(api.login("persona@ejemplo.test", "contrasena")).rejects.toBeInstanceOf(
      ErrorRespuesta,
    );
    await expect(api.yo("token-1")).rejects.toBeInstanceOf(ErrorRespuesta);
  });
});
