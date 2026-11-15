import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { crearFetchFalso } from "../../testing/fetch-falso";
import { ErrorApi, ErrorRed, ErrorRespuesta, ErrorTiempo } from "../errores";
import { solicitarJson } from "../http";

const BASE = "https://api.example.test";

describe("solicitarJson", () => {
  it("devuelve el estado y el cuerpo JSON en una respuesta correcta", async () => {
    const falso = crearFetchFalso([{ status: 200, cuerpo: { items: [] } }]);

    const respuesta = await solicitarJson<{ items: unknown[] }>({
      baseUrl: BASE,
      ruta: "/api/tareas",
      fetch: falso.fetch,
    });

    expect(respuesta.estado).toBe(200);
    expect(respuesta.datos).toEqual({ items: [] });
    expect(falso.peticiones[0]?.url).toBe(`${BASE}/api/tareas`);
    expect(falso.peticiones[0]?.init.method).toBe("GET");
  });

  it("acepta 204 sin cuerpo y no intenta parsear JSON", async () => {
    const falso = crearFetchFalso([{ status: 204 }]);

    const respuesta = await solicitarJson<void>({
      baseUrl: BASE,
      ruta: "/api/tareas",
      fetch: falso.fetch,
    });

    expect(respuesta.datos).toBeUndefined();
  });
});

describe("solicitarJson: errores del contrato", () => {
  it("convierte un 200 con JSON inválido en ErrorRespuesta", async () => {
    const falso = crearFetchFalso([{ status: 200, texto: "{no-json" }]);

    await expect(
      solicitarJson({ baseUrl: BASE, ruta: "/api/tareas", fetch: falso.fetch }),
    ).rejects.toBeInstanceOf(ErrorRespuesta);
  });

  it("normaliza un 400 con detalles y un 500 sin filtrarlos", async () => {
    const falso = crearFetchFalso([
      {
        status: 400,
        cuerpo: {
          error: "Datos inválidos.",
          detalles: [{ campo: "email", mensaje: "Inválido." }, { campo: 2 }],
        },
      },
      {
        status: 500,
        cuerpo: { error: "stack trace secreto", detalles: [{ campo: "x", mensaje: "y" }] },
      },
    ]);

    const error400 = await solicitarJson({
      baseUrl: BASE,
      ruta: "/api/auth/login",
      metodo: "POST",
      cuerpo: { email: "x" },
      fetch: falso.fetch,
    }).catch((e: unknown) => e);
    expect(error400).toBeInstanceOf(ErrorApi);
    expect((error400 as ErrorApi).detalles).toEqual([{ campo: "email", mensaje: "Inválido." }]);

    const error500 = await solicitarJson({
      baseUrl: BASE,
      ruta: "/api/tareas",
      fetch: falso.fetch,
    }).catch((e: unknown) => e);
    expect((error500 as ErrorApi).message).toBe("Error interno.");
    expect((error500 as ErrorApi).detalles).toEqual([]);
  });
});

describe("solicitarJson: red y cabeceras", () => {
  it("traduce error de red y timeout", async () => {
    const red = crearFetchFalso([{ errorRed: true }]);
    await expect(
      solicitarJson({ baseUrl: BASE, ruta: "/api/tareas", fetch: red.fetch }),
    ).rejects.toBeInstanceOf(ErrorRed);

    jest.useFakeTimers();
    const lento = crearFetchFalso([{ nuncaResuelve: true }]);
    const promesa = solicitarJson({
      baseUrl: BASE,
      ruta: "/api/tareas",
      fetch: lento.fetch,
      timeoutMs: 500,
    });
    jest.advanceTimersByTime(500);
    await expect(promesa).rejects.toBeInstanceOf(ErrorTiempo);
    jest.useRealTimers();
  });

  it("envía Bearer y JSON solo cuando corresponde", async () => {
    const falso = crearFetchFalso([{ status: 200, cuerpo: { ok: true } }]);

    await solicitarJson({
      baseUrl: BASE,
      ruta: "/api/tareas",
      metodo: "POST",
      cuerpo: { titulo: "x" },
      token: "token-1",
      fetch: falso.fetch,
    });

    expect(falso.peticiones[0]?.init.headers.Authorization).toBe("Bearer token-1");
    expect(falso.peticiones[0]?.init.headers["Content-Type"]).toBe("application/json");
  });
});

afterEach(() => {
  jest.useRealTimers();
});
