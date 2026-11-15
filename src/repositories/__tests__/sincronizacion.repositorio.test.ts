import { describe, expect, it } from "@jest/globals";

import { crearBaseFalsa } from "../../testing/base-falsa";
import {
  borrarMeta,
  guardarMeta,
  leerMeta,
  limpiarSincronizacion,
} from "../sincronizacion.repositorio";

describe("metadatos de sincronización", () => {
  it("lee una clave y devuelve null si no existe", async () => {
    const { db, registro } = crearBaseFalsa({
      fila: { valor: "2026-11-15T10:00:00.000Z" } as never,
    });

    await expect(leerMeta(db, "tareas_since")).resolves.toBe("2026-11-15T10:00:00.000Z");
    expect(registro.primeras[0]?.sql).toBe("SELECT valor FROM sincronizacion WHERE clave = ?");

    const vacia = crearBaseFalsa();
    await expect(leerMeta(vacia.db, "tareas_since")).resolves.toBeNull();
  });

  it("guarda con upsert, borra una clave y limpia la tabla", async () => {
    const { db, registro } = crearBaseFalsa();

    await guardarMeta(db, "tareas_since", "2026-11-15T10:00:00.000Z");
    await borrarMeta(db, "tareas_since");
    await limpiarSincronizacion(db);

    expect(registro.ejecuciones[0]?.sql).toContain("INSERT INTO sincronizacion");
    expect(registro.ejecuciones[0]?.sql).toContain("ON CONFLICT(clave) DO UPDATE");
    expect(registro.ejecuciones[1]?.sql).toBe("DELETE FROM sincronizacion WHERE clave = ?");
    expect(registro.ejecuciones[2]?.sql).toBe("DELETE FROM sincronizacion");
  });
});
