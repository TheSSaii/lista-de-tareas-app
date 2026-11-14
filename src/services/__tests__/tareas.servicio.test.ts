import { describe, expect, it } from "@jest/globals";

import { crearBaseFalsa, fila } from "../../testing/base-falsa";
import type { Tarea } from "../tarea";
import {
  alternarCompletada,
  actualizarTarea,
  crearTarea,
  eliminarTarea,
  listarTareas,
  posponerUnDia,
  type EntradaTarea,
} from "../tareas.servicio";

const AHORA = new Date(2026, 10, 14, 12, 0, 0);

function entrada(cambios: Partial<EntradaTarea> = {}): EntradaTarea {
  return {
    titulo: "Tarea válida",
    descripcion: null,
    prioridad: 2,
    vence_en: null,
    notificacion_id: null,
    ...cambios,
  };
}

function tarea(cambios: Partial<Tarea> = {}): Tarea {
  return {
    id: 1,
    titulo: "Comprar pan",
    descripcion: null,
    prioridad: 2,
    vence_en: null,
    completada: false,
    notificacion_id: null,
    ...cambios,
  };
}

const ENTRADA_VALIDA: EntradaTarea = {
  titulo: "Entregar informe",
  descripcion: "Con anexos",
  prioridad: 1,
  vence_en: "2026-11-20",
  notificacion_id: "notif-1",
};

describe("crearTarea", () => {
  it("no toca la base cuando la validación falla", async () => {
    const { db, registro } = crearBaseFalsa();

    const resultado = await crearTarea(db, entrada({ titulo: "ab" }), AHORA);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.errores.titulo).toBeDefined();
    }
    expect(registro.ejecuciones).toEqual([]);
    expect(registro.lecturas).toEqual([]);
    expect(registro.primeras).toEqual([]);
  });

  it("crea la tarea cuando la entrada es válida", async () => {
    const { db, registro } = crearBaseFalsa({ lastInsertRowId: 7 });

    const resultado = await crearTarea(db, ENTRADA_VALIDA, AHORA);

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.tarea).toEqual({
        id: 7,
        titulo: "Entregar informe",
        descripcion: "Con anexos",
        prioridad: 1,
        vence_en: "2026-11-20",
        completada: false,
        notificacion_id: "notif-1",
      });
    }
    expect(registro.ejecuciones).toHaveLength(1);
    expect(registro.ejecuciones[0]?.parametros).toEqual([
      "Entregar informe",
      "Con anexos",
      1,
      "2026-11-20",
      "notif-1",
    ]);
  });
});

describe("actualizarTarea", () => {
  it("actualiza una tarea existente y conserva completada", async () => {
    const { db, registro } = crearBaseFalsa({ fila: fila({ id: 5, completada: 1 }) });

    const resultado = await actualizarTarea(
      db,
      5,
      entrada({ titulo: "Título nuevo", prioridad: 3 }),
    );

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.tarea.id).toBe(5);
      expect(resultado.tarea.titulo).toBe("Título nuevo");
      expect(resultado.tarea.prioridad).toBe(3);
      expect(resultado.tarea.completada).toBe(true);
    }
    expect(registro.ejecuciones[0]?.parametros).toEqual(["Título nuevo", null, 3, null, null, 5]);
  });

  it("devuelve un error legible y errores vacíos si el id no existe", async () => {
    const { db, registro } = crearBaseFalsa({ fila: null });

    const resultado = await actualizarTarea(db, 99, entrada());

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.errores).toEqual({});
      expect(resultado.error).toEqual(expect.any(String));
      expect(resultado.error).not.toBe("");
    }
    expect(registro.ejecuciones).toEqual([]);
  });
});

describe("actualizarTarea · validación", () => {
  it("no escribe nada si la validación falla", async () => {
    const { db, registro } = crearBaseFalsa({ fila: fila({ id: 1 }) });

    const resultado = await actualizarTarea(db, 1, entrada({ titulo: "ab" }), AHORA);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.errores.titulo).toBeDefined();
    }
    expect(registro.ejecuciones).toEqual([]);
  });
});

describe("actualizarTarea · fechas", () => {
  it("permite editar una tarea vencida sin mover la fecha", async () => {
    const { db, registro } = crearBaseFalsa({
      fila: fila({ id: 3, vence_en: "2026-11-10" }),
    });

    const resultado = await actualizarTarea(
      db,
      3,
      entrada({ titulo: "Título corregido", vence_en: "2026-11-10" }),
      AHORA,
    );

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.tarea.titulo).toBe("Título corregido");
      expect(resultado.tarea.vence_en).toBe("2026-11-10");
    }
    expect(registro.ejecuciones[0]?.parametros).toEqual([
      "Título corregido",
      null,
      2,
      "2026-11-10",
      null,
      3,
    ]);
  });

  it("rechaza mover la fecha a una fecha pasada", async () => {
    const { db, registro } = crearBaseFalsa({
      fila: fila({ id: 3, vence_en: "2026-11-10" }),
    });

    const resultado = await actualizarTarea(db, 3, entrada({ vence_en: "2026-11-01" }), AHORA);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.errores.vence_en).toBeDefined();
    }
    expect(registro.ejecuciones).toEqual([]);
  });
});

describe("alternarCompletada", () => {
  it("invierte completada y la persiste", async () => {
    const { db, registro } = crearBaseFalsa();

    const resultado = await alternarCompletada(db, tarea({ id: 3, completada: false }));

    expect(resultado.completada).toBe(true);
    expect(registro.ejecuciones[0]?.parametros).toEqual([1, 3]);
  });
});

describe("posponerUnDia", () => {
  it("suma un día, persiste y devuelve true", async () => {
    const { db, registro } = crearBaseFalsa();

    const resultado = await posponerUnDia(db, tarea({ id: 4, vence_en: "2026-11-30" }));

    expect(resultado).toBe(true);
    expect(registro.ejecuciones).toHaveLength(1);
    expect(registro.ejecuciones[0]?.parametros[3]).toBe("2026-12-01");
  });

  it("devuelve false sin ejecutar SQL si no tiene fecha", async () => {
    const { db, registro } = crearBaseFalsa();

    const resultado = await posponerUnDia(db, tarea({ vence_en: null }));

    expect(resultado).toBe(false);
    expect(registro.ejecuciones).toEqual([]);
  });

  it("devuelve false sin ejecutar SQL si la fecha está corrupta", async () => {
    const { db, registro } = crearBaseFalsa();

    const resultado = await posponerUnDia(db, tarea({ vence_en: "2026-02-30" }));

    expect(resultado).toBe(false);
    expect(registro.ejecuciones).toEqual([]);
  });
});

describe("listarTareas", () => {
  it("devuelve las tareas ordenadas", async () => {
    const { db } = crearBaseFalsa({
      filas: [
        fila({ id: 1, titulo: "baja", prioridad: 3 }),
        fila({ id: 2, titulo: "alta", prioridad: 1 }),
        fila({ id: 3, titulo: "media", prioridad: 2 }),
      ],
    });

    const tareas = await listarTareas(db, AHORA);

    expect(tareas.map((item) => item.titulo)).toEqual(["alta", "media", "baja"]);
  });
});

describe("eliminarTarea", () => {
  it("delega en el repositorio con el id como parámetro", async () => {
    const { db, registro } = crearBaseFalsa();

    const resultado = await eliminarTarea(db, 9);

    expect(resultado).toBe(true);
    expect(registro.ejecuciones[0]?.sql).toBe("DELETE FROM tarea WHERE id = ?");
    expect(registro.ejecuciones[0]?.parametros).toEqual([9]);
  });
});
