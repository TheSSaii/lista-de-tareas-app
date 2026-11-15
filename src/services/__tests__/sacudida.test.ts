import { describe, expect, it } from "@jest/globals";

import { ENFRIAMIENTO_MS, UMBRAL_SACUDIDA, esSacudida, magnitud } from "../sacudida";

function medicion(x: number, y: number, z: number) {
  return { x, y, z, timestamp: 0 };
}

describe("magnitud", () => {
  it("calcula la magnitud de la aceleración", () => {
    expect(magnitud(medicion(3, 4, 0))).toBe(5);
  });
});

describe("esSacudida", () => {
  it("no dispara por debajo del umbral", () => {
    expect(esSacudida(medicion(1, 0, 0), null, 10_000)).toBe(false);
  });

  it("dispara por encima del umbral", () => {
    expect(esSacudida(medicion(UMBRAL_SACUDIDA + 0.1, 0, 0), null, 10_000)).toBe(true);
  });

  it("no vuelve a disparar durante el enfriamiento", () => {
    expect(esSacudida(medicion(3, 0, 0), 10_000, 10_000 + ENFRIAMIENTO_MS - 1)).toBe(false);
  });

  it("vuelve a disparar cuando termina el enfriamiento", () => {
    expect(esSacudida(medicion(3, 0, 0), 10_000, 10_000 + ENFRIAMIENTO_MS)).toBe(true);
  });
});
