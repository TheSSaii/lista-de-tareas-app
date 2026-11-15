import { afterEach, describe, expect, it } from "@jest/globals";
import * as SecureStore from "expo-secure-store";

import { borrarSesion, leerSesion, guardarSesion } from "../sesion.almacen";
import type { SesionGuardada } from "../../services/tipos-sesion";

type AlmacenMock = {
  __memoria: Map<string, string>;
};

const memoria = (SecureStore as unknown as AlmacenMock).__memoria;

const SESION: SesionGuardada = {
  token: "token-1",
  refreshToken: "refresh-1",
  usuario: { id: "uid-1", email: "persona@ejemplo.test" },
  expiraEn: 1_800_000_000_000,
};

describe("sesion.almacen", () => {
  afterEach(() => {
    memoria.clear();
  });

  it("guarda y lee una sesión completa", async () => {
    await guardarSesion(SESION);

    await expect(leerSesion()).resolves.toEqual(SESION);
  });

  it("devuelve null y limpia si falta una clave o el usuario está corrupto", async () => {
    await guardarSesion(SESION);
    memoria.delete("lista_tareas_token");

    await expect(leerSesion()).resolves.toBeNull();

    await guardarSesion(SESION);
    memoria.set("lista_tareas_usuario", "{no-json");

    await expect(leerSesion()).resolves.toBeNull();
    expect(memoria.size).toBe(0);
  });

  it("devuelve null si la expiración no es numérica", async () => {
    await guardarSesion(SESION);
    memoria.set("lista_tareas_expira", "no-numero");

    await expect(leerSesion()).resolves.toBeNull();
  });

  it("borra todas las claves de sesión", async () => {
    await guardarSesion(SESION);

    await borrarSesion();

    expect(memoria.size).toBe(0);
  });
});
