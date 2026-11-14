import { describe, expect, it } from "@jest/globals";

import { abrirBaseDeDatos } from "../abrir";
import type { BaseDeDatos } from "../tipos";

function crearBaseFalsa(registro: string[]): BaseDeDatos {
  return {
    async execAsync(sql) {
      registro.push(sql);
    },
    async runAsync() {
      return { lastInsertRowId: 0, changes: 0 };
    },
    async getAllAsync<T>() {
      return [] as T[];
    },
    async getFirstAsync<T>() {
      return { user_version: 0 } as unknown as T;
    },
  };
}

describe("abrirBaseDeDatos", () => {
  it("abre tareas.db, activa WAL y claves foráneas, y migra la base", async () => {
    const registro: string[] = [];
    const nombres: string[] = [];
    const db = crearBaseFalsa(registro);

    const resultado = await abrirBaseDeDatos(async (nombre) => {
      nombres.push(nombre);
      return db;
    });

    expect(nombres).toEqual(["tareas.db"]);
    expect(registro.slice(0, 2)).toEqual(["PRAGMA journal_mode = WAL", "PRAGMA foreign_keys = ON"]);
    expect(registro).toContain("BEGIN");
    expect(registro).toContain("COMMIT");
    expect(resultado).toBe(db);
  });
});
