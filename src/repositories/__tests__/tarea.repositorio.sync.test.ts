import { describe, expect, it } from "@jest/globals";

import { crearBaseFalsa, fila } from "../../testing/base-falsa";
import {
  actualizarRemoto,
  asignarRemoteId,
  borrarTodasLasTareas,
  contarPendientes,
  contarTareas,
  insertarRemoto,
  listarPendientes,
  marcarSincronizada,
  obtenerPorRemoteId,
} from "../tarea.repositorio";

const REMOTO = {
  id: "uuid-remoto",
  titulo: "Tarea remota",
  descripcion: null,
  prioridad: 2 as const,
  vence_en: "2026-12-01T10:00:00.000Z",
  completada: false,
  created_at: "2026-11-15T10:00:00.000Z",
  updated_at: "2026-11-15T11:00:00.000Z",
  deleted_at: null,
};

describe("listarPendientes", () => {
  it("selecciona solo pendientes con sus campos de sincronización", async () => {
    const { db, registro } = crearBaseFalsa({
      filas: [fila({ remote_id: "uuid-1", updated_at: "2026-11-15T11:00:00.000Z", pending: 1 })],
    });

    const pendientes = await listarPendientes(db);

    expect(registro.lecturas[0]?.sql).toBe(
      "SELECT id, titulo, descripcion, prioridad, vence_en, completada, notificacion_id, remote_id, updated_at, deleted, pending FROM tarea WHERE pending = 1 ORDER BY updated_at, id",
    );
    expect(pendientes[0]).toMatchObject({
      id: 1,
      remote_id: "uuid-1",
      pending: true,
      deleted: false,
    });
  });
});

describe("obtenerPorRemoteId", () => {
  it("busca por remote_id y devuelve null si no existe", async () => {
    const { db, registro } = crearBaseFalsa({ fila: fila({ remote_id: "uuid-9" }) });

    const encontrada = await obtenerPorRemoteId(db, "uuid-9");

    expect(registro.primeras[0]?.sql).toContain("WHERE remote_id = ?");
    expect(registro.primeras[0]?.parametros).toEqual(["uuid-9"]);
    expect(encontrada?.remote_id).toBe("uuid-9");

    const vacia = crearBaseFalsa();
    await expect(obtenerPorRemoteId(vacia.db, "no-existe")).resolves.toBeNull();
  });
});

describe("asignarRemoteId", () => {
  it("actualiza solo la columna remote_id", async () => {
    const { db, registro } = crearBaseFalsa();

    await asignarRemoteId(db, 3, "uuid-nuevo");

    expect(registro.ejecuciones[0]?.sql).toBe("UPDATE tarea SET remote_id = ? WHERE id = ?");
    expect(registro.ejecuciones[0]?.parametros).toEqual(["uuid-nuevo", 3]);
  });
});

describe("insertarRemoto", () => {
  it("inserta sin notificacion_id y deja pending en 0", async () => {
    const { db, registro } = crearBaseFalsa({ lastInsertRowId: 12 });

    const id = await insertarRemoto(db, REMOTO);

    expect(id).toBe(12);
    expect(registro.ejecuciones[0]?.sql).toBe(
      "INSERT INTO tarea (titulo, descripcion, prioridad, vence_en, completada, notificacion_id, remote_id, updated_at, deleted, pending) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, 0)",
    );
    expect(registro.ejecuciones[0]?.parametros).toEqual([
      REMOTO.titulo,
      REMOTO.descripcion,
      REMOTO.prioridad,
      REMOTO.vence_en,
      0,
      REMOTO.id,
      REMOTO.updated_at,
      0,
    ]);
  });

  it("marca deleted cuando el remoto trae deleted_at", async () => {
    const { db, registro } = crearBaseFalsa();

    await insertarRemoto(db, { ...REMOTO, deleted_at: "2026-11-15T12:00:00.000Z" });

    expect(registro.ejecuciones[0]?.parametros?.at(-1)).toBe(1);
  });
});

describe("actualizarRemoto", () => {
  it("actualiza campos y limpia pending sin tocar notificacion_id", async () => {
    const { db, registro } = crearBaseFalsa();

    await actualizarRemoto(db, 4, REMOTO);

    expect(registro.ejecuciones[0]?.sql).toBe(
      "UPDATE tarea SET titulo = ?, descripcion = ?, prioridad = ?, vence_en = ?, completada = ?, updated_at = ?, deleted = ?, pending = 0 WHERE id = ?",
    );
    expect(registro.ejecuciones[0]?.parametros).toEqual([
      REMOTO.titulo,
      REMOTO.descripcion,
      REMOTO.prioridad,
      REMOTO.vence_en,
      0,
      REMOTO.updated_at,
      0,
      4,
    ]);
  });
});

describe("marcarSincronizada", () => {
  it("limpia pending y guarda el updated_at del servidor", async () => {
    const { db, registro } = crearBaseFalsa();

    await marcarSincronizada(db, 5, "2026-11-15T12:00:00.000Z");

    expect(registro.ejecuciones[0]?.sql).toBe(
      "UPDATE tarea SET pending = 0, updated_at = ? WHERE id = ?",
    );
    expect(registro.ejecuciones[0]?.parametros).toEqual(["2026-11-15T12:00:00.000Z", 5]);
  });
});

describe("contarPendientes y borrarTodasLasTareas", () => {
  it("cuenta pendientes y permite purgar la tabla local", async () => {
    const { db, registro } = crearBaseFalsa({ fila: { total: 3 } as never });

    await expect(contarPendientes(db)).resolves.toBe(3);
    await borrarTodasLasTareas(db);

    expect(registro.primeras[0]?.sql).toBe("SELECT COUNT(*) AS total FROM tarea WHERE pending = 1");
    expect(registro.ejecuciones[0]?.sql).toBe("DELETE FROM tarea");
  });

  it("devuelve 0 si la consulta no trae fila", async () => {
    const { db } = crearBaseFalsa();

    await expect(contarPendientes(db)).resolves.toBe(0);
    await expect(contarTareas(db)).resolves.toBe(0);
  });
});

describe("actualizarRemoto y asignarRemoteId: bordes", () => {
  it("actualiza una tumba remota", async () => {
    const { db, registro } = crearBaseFalsa();

    await actualizarRemoto(db, 4, { ...REMOTO, deleted_at: "2026-11-15T12:00:00.000Z" });

    expect(registro.ejecuciones[0]?.parametros?.at(-2)).toBe(1);
  });

  it("devuelve false si no cambió ninguna fila", async () => {
    const { db } = crearBaseFalsa({ changes: 0 });

    await expect(asignarRemoteId(db, 3, "uuid-nuevo")).resolves.toBe(false);
  });
});
