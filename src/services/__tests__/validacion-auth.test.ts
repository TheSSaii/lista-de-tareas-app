import { describe, expect, it } from "@jest/globals";

import { destinoSesion } from "../navegacion.sesion";
import { validarAuth } from "../validacion-auth";

describe("validarAuth", () => {
  it("acepta un correo y una contraseña válidos", () => {
    expect(validarAuth({ email: "persona@ejemplo.test", password: "contrasena" })).toEqual({});
  });

  it("rechaza correo inválido y contraseña corta", () => {
    const errores = validarAuth({ email: "sin-arroba", password: "corta" });
    expect(errores.email).toBeDefined();
    expect(errores.password).toBeDefined();
  });
});

describe("destinoSesion", () => {
  it("manda al login a un invitado fuera de auth", () => {
    expect(destinoSesion("invitado", ["(tabs)"])).toBe("/login");
  });

  it("deja al invitado en auth y al autenticado fuera de auth", () => {
    expect(destinoSesion("invitado", ["(auth)", "login"])).toBeNull();
    expect(destinoSesion("autenticado", ["(tabs)"])).toBeNull();
    expect(destinoSesion("autenticado", ["(auth)", "login"])).toBe("/");
  });

  it("no redirige mientras carga", () => {
    expect(destinoSesion("cargando", ["(tabs)"])).toBeNull();
  });
});
