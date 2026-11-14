import { describe, expect, it } from "@jest/globals";

import { crearBaseFalsa, fila } from "../../testing/base-falsa";
import {
  actualizar,
  crear,
  type DatosTarea,
  eliminar,
  filaATarea,
  listar,
  marcarCompletada,
  obtener,
} from "../tarea.repositorio";

function datos(cambios: Partial<DatosTarea> = {}): DatosTarea {
  return {
    titulo: "Comprar pan",
    descripcion: null,
    prioridad: 2,
    vence_en: null,
    notificacion_id: null,
    ...cambios,
  };
}

const SQL_LISTAR =
  "SELECT id, titulo, descripcion, prioridad, vence_en, completada, notificacion_id FROM tarea";

describe("filaATarea", () => {
  it("convierte completada 0 y 1 y conserva los nulls", () => {
    const pendiente = filaATarea(fila({ completada: 0 }));
    expect(pendiente.ok).toBe(true);
    if (!pendiente.ok) {
      return;
    }
    expect(pendiente.tarea.completada).toBe(false);
    expect(pendiente.tarea.descripcion).toBeNull();
    expect(pendiente.tarea.vence_en).toBeNull();
    expect(pendiente.tarea.notificacion_id).toBeNull();

    const hecha = filaATarea(fila({ completada: 1 }));
    expect(hecha.ok).toBe(true);
    if (!hecha.ok) {
      return;
    }
    expect(hecha.tarea.completada).toBe(true);
  });

  it("devuelve error con prioridad 0 o 4", () => {
    for (const prioridad of [0, 4]) {
      const resultado = filaATarea(fila({ prioridad }));
      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.error).toBeInstanceOf(Error);
      }
    }
  });
});

describe("crear", () => {
  it("envía los parámetros en el orden correcto", async () => {
    const { db, registro } = crearBaseFalsa({ lastInsertRowId: 7 });

    const tarea = await crear(
      db,
      datos({
        titulo: "Entregar informe",
        descripcion: "Con anexos",
        prioridad: 1,
        vence_en: "2026-12-01T10:00:00.000Z",
        notificacion_id: "notif-1",
      }),
    );

    const ejecucion = registro.ejecuciones[0];
    expect(ejecucion).toBeDefined();
    expect(ejecucion?.sql).toBe(
      "INSERT INTO tarea (titulo, descripcion, prioridad, vence_en, notificacion_id) VALUES (?, ?, ?, ?, ?)",
    );
    expect(ejecucion?.parametros).toEqual([
      "Entregar informe",
      "Con anexos",
      1,
      "2026-12-01T10:00:00.000Z",
      "notif-1",
    ]);
    expect(tarea).toEqual({
      id: 7,
      titulo: "Entregar informe",
      descripcion: "Con anexos",
      prioridad: 1,
      vence_en: "2026-12-01T10:00:00.000Z",
      completada: false,
      notificacion_id: "notif-1",
    });
  });

  it("pasa un título malicioso como parámetro y no lo concatena al SQL", async () => {
    const { db, registro } = crearBaseFalsa();
    const titulo = "'; DROP TABLE tarea; --";

    await crear(db, datos({ titulo }));

    const ejecucion = registro.ejecuciones[0];
    expect(ejecucion?.sql).not.toContain("DROP TABLE");
    expect(ejecucion?.parametros).toContain(titulo);
  });
});

describe("actualizar", () => {
  it("no incluye el id entre los campos modificables", async () => {
    const { db, registro } = crearBaseFalsa();

    await actualizar(db, 42, datos({ titulo: "Título nuevo", prioridad: 3 }));

    const ejecucion = registro.ejecuciones[0];
    expect(ejecucion).toBeDefined();
    const partes = ejecucion?.sql.split(" WHERE ") ?? [];
    const campos = (partes[0]?.replace("UPDATE tarea SET ", "") ?? "")
      .split(", ")
      .map((campo) => campo.replace(" = ?", ""));
    expect(campos).toEqual(["titulo", "descripcion", "prioridad", "vence_en", "notificacion_id"]);
    expect(campos).not.toContain("id");
    expect(partes[1]).toBe("id = ?");
    expect(ejecucion?.parametros).toEqual(["Título nuevo", null, 3, null, null, 42]);
  });
});

describe("eliminar", () => {
  it("usa WHERE id = ? con el id como parámetro", async () => {
    const { db, registro } = crearBaseFalsa();

    await eliminar(db, 9);

    const ejecucion = registro.ejecuciones[0];
    expect(ejecucion?.sql).toBe("DELETE FROM tarea WHERE id = ?");
    expect(ejecucion?.parametros).toEqual([9]);
  });
});

describe("listar", () => {
  it("usa un SQL literal sin orden y devuelve las tareas mapeadas", async () => {
    const { db, registro } = crearBaseFalsa({
      filas: [fila(), fila({ id: 2, completada: 1 })],
    });

    const tareas = await listar(db);

    const consulta = registro.lecturas[0];
    expect(consulta?.sql).toBe(SQL_LISTAR);
    expect(consulta?.sql).not.toContain("ORDER BY");
    expect(consulta?.parametros).toEqual([]);
    expect(tareas).toHaveLength(2);
    expect(tareas[1]?.completada).toBe(true);
  });
});

describe("obtener", () => {
  it("usa WHERE id = ? con el id como parámetro y devuelve null si no existe", async () => {
    const { db, registro } = crearBaseFalsa({ fila: fila({ id: 5 }) });

    const tarea = await obtener(db, 5);

    const consulta = registro.primeras[0];
    expect(consulta?.sql).toBe(
      "SELECT id, titulo, descripcion, prioridad, vence_en, completada, notificacion_id FROM tarea WHERE id = ?",
    );
    expect(consulta?.parametros).toEqual([5]);
    expect(tarea?.id).toBe(5);

    const vacia = crearBaseFalsa();
    await expect(obtener(vacia.db, 99)).resolves.toBeNull();
  });

  it("lanza un error al mapear una fila inválida sin filtrarla en silencio", async () => {
    const invalida = fila({ id: 8, prioridad: 4 });
    const lista = crearBaseFalsa({ filas: [invalida] });
    await expect(listar(lista.db)).rejects.toThrow("fila de tarea inválida: id=8");

    const una = crearBaseFalsa({ fila: invalida });
    await expect(obtener(una.db, 8)).rejects.toThrow("fila de tarea inválida: id=8");
  });
});

describe("marcarCompletada", () => {
  it("actualiza completada con 1 al marcar y 0 al desmarcar, con el id como parámetro", async () => {
    const { db, registro } = crearBaseFalsa();

    await marcarCompletada(db, 3, true);
    await marcarCompletada(db, 3, false);

    expect(registro.ejecuciones).toHaveLength(2);
    expect(registro.ejecuciones[0]?.sql).toBe("UPDATE tarea SET completada = ? WHERE id = ?");
    expect(registro.ejecuciones[0]?.parametros).toEqual([1, 3]);
    expect(registro.ejecuciones[1]?.parametros).toEqual([0, 3]);
  });
});
