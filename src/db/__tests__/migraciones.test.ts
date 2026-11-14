import { describe, expect, it } from "@jest/globals";

import { migraciones } from "../esquema";
import { migrar } from "../migraciones";
import type { BaseDeDatos, ParametroSQL } from "../tipos";

type Lectura = { sql: string; parametros: ParametroSQL[] };

type Registro = {
  lecturas: Lectura[];
  ejecutadas: string[];
};

function crearBaseFalsa(
  version: number,
  fallarEn?: string,
): { db: BaseDeDatos; registro: Registro } {
  const registro: Registro = { lecturas: [], ejecutadas: [] };

  const db: BaseDeDatos = {
    async execAsync(sql) {
      registro.ejecutadas.push(sql);
      if (fallarEn !== undefined && sql === fallarEn) {
        throw new Error("fallo simulado");
      }
    },
    async runAsync() {
      return { lastInsertRowId: 0, changes: 0 };
    },
    async getAllAsync<T>() {
      return [] as T[];
    },
    async getFirstAsync<T>(sql: string, parametros: ParametroSQL[]) {
      registro.lecturas.push({ sql, parametros });
      return { user_version: version } as unknown as T;
    },
  };

  return { db, registro };
}

const VERSION_1 = migraciones.find((migracion) => migracion.version === 1);

describe("migrar", () => {
  it("aplica la versión 1 sobre una base vacía y deja user_version = 1", async () => {
    const { db, registro } = crearBaseFalsa(0);

    await migrar(db);

    expect(registro.lecturas).toEqual([{ sql: "PRAGMA user_version", parametros: [] }]);
    expect(registro.ejecutadas).toEqual([
      "BEGIN",
      VERSION_1?.sql,
      "PRAGMA user_version = 1",
      "COMMIT",
    ]);
  });

  it("no vuelve a ejecutar nada si user_version ya es 1", async () => {
    const { db, registro } = crearBaseFalsa(1);

    await migrar(db);

    expect(registro.ejecutadas).toEqual([]);
  });

  it("aplica solo las migraciones pendientes cuando existe la versión 2", async () => {
    const version2 = { version: 2, sql: "CREATE TABLE extra (id INTEGER);" };
    const { db, registro } = crearBaseFalsa(1);

    await migrar(db, [...migraciones, version2]);

    expect(registro.ejecutadas).toEqual([
      "BEGIN",
      version2.sql,
      "PRAGMA user_version = 2",
      "COMMIT",
    ]);
    expect(registro.ejecutadas).not.toContain(VERSION_1?.sql);
  });
});

describe("migrar: orden y errores", () => {
  it("ordena las migraciones pendientes por versión antes de aplicarlas", async () => {
    const version2 = { version: 2, sql: "CREATE TABLE dos (id INTEGER);" };
    const version3 = { version: 3, sql: "CREATE TABLE tres (id INTEGER);" };
    const { db, registro } = crearBaseFalsa(0);

    await migrar(db, [version3, version2]);

    expect(registro.ejecutadas).toEqual([
      "BEGIN",
      version2.sql,
      "PRAGMA user_version = 2",
      version3.sql,
      "PRAGMA user_version = 3",
      "COMMIT",
    ]);
  });

  it("rechaza una versión inválida sin fijarla", async () => {
    const invalida = { version: 1.5, sql: "CREATE TABLE invalida (id INTEGER);" };
    const { db, registro } = crearBaseFalsa(0);

    await expect(migrar(db, [invalida])).rejects.toThrow("versión de migración inválida: 1.5");

    expect(registro.ejecutadas).toEqual(["BEGIN", invalida.sql, "ROLLBACK"]);
  });

  it("hace ROLLBACK, relanza el error y no actualiza user_version si una migración falla", async () => {
    const version2 = { version: 2, sql: "ALTER TABLE tarea ADD COLUMN falla TEXT;" };
    const { db, registro } = crearBaseFalsa(1, version2.sql);

    await expect(migrar(db, [...migraciones, version2])).rejects.toThrow("fallo simulado");

    expect(registro.ejecutadas).toEqual(["BEGIN", version2.sql, "ROLLBACK"]);
    expect(registro.ejecutadas).not.toContain("PRAGMA user_version = 2");
    expect(registro.ejecutadas).not.toContain("COMMIT");
  });
});
