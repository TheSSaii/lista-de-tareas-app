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
const VERSION_2 = migraciones.find((migracion) => migracion.version === 2);

describe("migrar", () => {
  it("aplica la v1 y la v2 sobre una base vacía y deja user_version = 2", async () => {
    const { db, registro } = crearBaseFalsa(0);

    await migrar(db);

    expect(registro.lecturas).toEqual([{ sql: "PRAGMA user_version", parametros: [] }]);
    expect(registro.ejecutadas).toEqual([
      "BEGIN",
      VERSION_1?.sql,
      "PRAGMA user_version = 1",
      VERSION_2?.sql,
      "PRAGMA user_version = 2",
      "COMMIT",
    ]);
  });

  it("aplica solo la v2 si user_version ya es 1", async () => {
    const { db, registro } = crearBaseFalsa(1);

    await migrar(db);

    expect(registro.ejecutadas).toEqual([
      "BEGIN",
      VERSION_2?.sql,
      "PRAGMA user_version = 2",
      "COMMIT",
    ]);
  });
});

describe("migrar: no-op y versiones posteriores", () => {
  it("no vuelve a ejecutar nada si user_version ya es 2", async () => {
    const { db, registro } = crearBaseFalsa(2);

    await migrar(db);

    expect(registro.ejecutadas).toEqual([]);
  });

  it("aplica solo las migraciones posteriores a la versión actual", async () => {
    const version3 = { version: 3, sql: "CREATE TABLE extra (id INTEGER);" };
    const { db, registro } = crearBaseFalsa(2);

    await migrar(db, [...migraciones, version3]);

    expect(registro.ejecutadas).toEqual([
      "BEGIN",
      version3.sql,
      "PRAGMA user_version = 3",
      "COMMIT",
    ]);
    expect(registro.ejecutadas).not.toContain(VERSION_2?.sql);
  });
});

describe("migrar: orden y errores", () => {
  it("ordena las migraciones pendientes por versión antes de aplicarlas", async () => {
    const version3 = { version: 3, sql: "CREATE TABLE tres (id INTEGER);" };
    const version4 = { version: 4, sql: "CREATE TABLE cuatro (id INTEGER);" };
    const { db, registro } = crearBaseFalsa(2);

    await migrar(db, [version4, version3]);

    expect(registro.ejecutadas).toEqual([
      "BEGIN",
      version3.sql,
      "PRAGMA user_version = 3",
      version4.sql,
      "PRAGMA user_version = 4",
      "COMMIT",
    ]);
  });

  it("rechaza una versión inválida sin fijarla", async () => {
    const invalida = { version: 2.5, sql: "CREATE TABLE invalida (id INTEGER);" };
    const { db, registro } = crearBaseFalsa(2);

    await expect(migrar(db, [invalida])).rejects.toThrow("versión de migración inválida: 2.5");

    expect(registro.ejecutadas).toEqual(["BEGIN", invalida.sql, "ROLLBACK"]);
  });

  it("hace ROLLBACK, relanza el error y no fija la versión que falla", async () => {
    const version3 = { version: 3, sql: "ALTER TABLE tarea ADD COLUMN falla TEXT;" };
    const { db, registro } = crearBaseFalsa(1, version3.sql);

    await expect(migrar(db, [...migraciones, version3])).rejects.toThrow("fallo simulado");

    expect(registro.ejecutadas).toEqual([
      "BEGIN",
      VERSION_2?.sql,
      "PRAGMA user_version = 2",
      version3.sql,
      "ROLLBACK",
    ]);
    expect(registro.ejecutadas).not.toContain("PRAGMA user_version = 3");
    expect(registro.ejecutadas).not.toContain("COMMIT");
  });
});
