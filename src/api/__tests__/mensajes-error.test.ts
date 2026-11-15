import { describe, expect, it } from "@jest/globals";

import { mensajeDeError } from "../mensajes-error";
import { ErrorApi, ErrorConfig, ErrorRed, ErrorTiempo } from "../errores";

describe("mensajeDeError", () => {
  it("traduce los códigos de autenticación sin filtrar detalles internos", () => {
    expect(mensajeDeError(new ErrorApi(409, "x"))).toBe("Ese correo ya está registrado.");
    expect(mensajeDeError(new ErrorApi(401, "x"))).toBe("Correo o contraseña incorrectos.");
    expect(mensajeDeError(new ErrorApi(429, "x"))).toBe("Demasiados intentos. Espera un momento.");
    expect(mensajeDeError(new ErrorApi(500, "x"))).toBe("Error interno. Inténtalo más tarde.");
  });

  it("traduce red, timeout y configuración", () => {
    expect(mensajeDeError(new ErrorRed())).toContain("conectar");
    expect(mensajeDeError(new ErrorTiempo())).toContain("tardó");
    expect(mensajeDeError(new ErrorConfig("Falta configurar."))).toBe("Falta configurar.");
  });

  it("no muestra errores técnicos desconocidos", () => {
    expect(mensajeDeError(new Error("SQLITE_IOERR"))).toBe("Ocurrió un error inesperado.");
  });
});
