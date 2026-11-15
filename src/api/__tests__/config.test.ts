import { describe, expect, it } from "@jest/globals";

import { leerConfigApi, normalizarBaseUrl } from "../config";

describe("normalizarBaseUrl", () => {
  it("quita la barra final y conserva HTTPS", () => {
    expect(normalizarBaseUrl("https://api.example.test/")).toBe("https://api.example.test");
  });

  it("rechaza vacío, URL inválida y HTTP no local", () => {
    expect(() => normalizarBaseUrl(undefined)).toThrow("EXPO_PUBLIC_API_URL");
    expect(() => normalizarBaseUrl("no es una url")).toThrow("no es una URL válida");
    expect(() => normalizarBaseUrl("http://api.example.test")).toThrow("HTTPS");
  });

  it("permite localhost por HTTP solo fuera de producción", () => {
    expect(normalizarBaseUrl("http://localhost:3000/")).toBe("http://localhost:3000");
  });
});

describe("leerConfigApi", () => {
  it("devuelve null si no hay configuración y no lanza", () => {
    expect(leerConfigApi(undefined)).toBeNull();
    expect(leerConfigApi("https://api.example.test")).toEqual({
      baseUrl: "https://api.example.test",
    });
  });
});
