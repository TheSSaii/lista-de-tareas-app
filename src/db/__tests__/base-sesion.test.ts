import { describe, expect, it, jest } from "@jest/globals";

import { crearBaseFalsa } from "../../testing/base-falsa";
import { abrirBaseDeDatos } from "../abrir";
import { obtenerBaseDeDatos } from "../base-sesion";

jest.mock("../abrir", () => ({ abrirBaseDeDatos: jest.fn() }));

const abrir = abrirBaseDeDatos as jest.MockedFunction<typeof abrirBaseDeDatos>;

describe("obtenerBaseDeDatos", () => {
  it("reintenta tras un fallo y luego reutiliza la misma promesa", async () => {
    const { db } = crearBaseFalsa();
    abrir.mockRejectedValueOnce(new Error("fallo de apertura")).mockResolvedValueOnce(db);

    await expect(obtenerBaseDeDatos()).rejects.toThrow("fallo de apertura");

    const primera = obtenerBaseDeDatos();
    const segunda = obtenerBaseDeDatos();

    expect(primera).toBe(segunda);
    await expect(primera).resolves.toBe(db);
    expect(abrir).toHaveBeenCalledTimes(2);
  });
});
