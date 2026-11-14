import { describe, expect, it } from "@jest/globals";

import { abrirBaseDeDatos } from "../abrir.web";

describe("abrirBaseDeDatos en web", () => {
  it("falla de forma explícita porque SQLite no está disponible", async () => {
    await expect(abrirBaseDeDatos()).rejects.toThrow("SQLite no está disponible");
  });
});
