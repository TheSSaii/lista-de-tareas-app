import { describe, expect, it } from "@jest/globals";

import { migraciones } from "../esquema";

describe("esquema de tarea", () => {
  it("define la v1 con las siete columnas y los dos CHECK", () => {
    expect(migraciones).toHaveLength(2);
    const primera = migraciones.find((migracion) => migracion.version === 1);
    expect(primera).toBeDefined();
    const sql = primera?.sql ?? "";

    for (const columna of [
      "id",
      "titulo",
      "descripcion",
      "prioridad",
      "vence_en",
      "completada",
      "notificacion_id",
    ]) {
      expect(sql).toContain(columna);
    }

    expect(sql).toContain("id INTEGER PRIMARY KEY AUTOINCREMENT");
    expect(sql).toContain("titulo TEXT NOT NULL");
    expect(sql).toContain("descripcion TEXT");
    expect(sql).toContain("prioridad INTEGER NOT NULL DEFAULT 2");
    expect(sql).toContain("vence_en TEXT");
    expect(sql).toContain("completada INTEGER NOT NULL DEFAULT 0");
    expect(sql).toContain("notificacion_id TEXT");
    expect(sql).toContain("CHECK (prioridad BETWEEN 1 AND 3)");
    expect(sql).toContain("CHECK (completada IN (0,1))");
  });

  it("define la v2 aditiva para sincronización sin reconstruir la tabla", () => {
    const segunda = migraciones.find((migracion) => migracion.version === 2);
    expect(segunda).toBeDefined();
    const sql = segunda?.sql ?? "";

    for (const columna of ["remote_id", "updated_at", "deleted", "pending"]) {
      expect(sql).toContain(`ADD COLUMN ${columna}`);
    }
    expect(sql).toContain("UPDATE tarea SET pending = 1");
    expect(sql).toContain("CREATE TABLE sincronizacion");
    expect(sql).not.toContain("DROP TABLE");
    expect(sql).not.toContain("ALTER TABLE tarea RENAME");
  });
});
