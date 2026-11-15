import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { BaseDeDatos } from "../../db/tipos";
import { crearBaseFalsa, fila } from "../../testing/base-falsa";
import type { EstadoPermiso, Notificador } from "../notificaciones";
import type { Tarea } from "../tarea";
import type { EntradaTarea } from "../tareas.servicio";
import {
  actualizarTareaConRecordatorio,
  alternarTareaConRecordatorio,
  crearTareaConRecordatorio,
  eliminarTareaConRecordatorio,
  posponerTareaConRecordatorio,
  restaurarTareaConRecordatorio,
} from "../recordatorios.servicio";

const AHORA = new Date(2026, 10, 15, 12, 0, 0);
const VENCE = new Date(2026, 10, 15, 13, 0, 0).toISOString();

type DobleNotificador = {
  notificador: Notificador;
  disponible: jest.Mock<Notificador["isAvailableAsync"]>;
  obtenerPermiso: jest.Mock<Notificador["obtenerPermisoAsync"]>;
  pedirPermiso: jest.Mock<Notificador["pedirPermisoAsync"]>;
  programar: jest.Mock<Notificador["programarAsync"]>;
  cancelar: jest.Mock<Notificador["cancelarAsync"]>;
};

function dobleNotificador(opciones: { permiso?: EstadoPermiso; disponible?: boolean } = {}) {
  const permiso = opciones.permiso ?? "concedido";
  const disponible = jest.fn<Notificador["isAvailableAsync"]>(
    async () => opciones.disponible ?? true,
  );
  const obtenerPermiso = jest.fn<Notificador["obtenerPermisoAsync"]>(async () => permiso);
  const pedirPermiso = jest.fn<Notificador["pedirPermisoAsync"]>(async () => permiso);
  const programar = jest.fn<Notificador["programarAsync"]>(async () => "notif-nueva");
  const cancelar = jest.fn<Notificador["cancelarAsync"]>(async () => undefined);

  return {
    notificador: {
      isAvailableAsync: disponible,
      obtenerPermisoAsync: obtenerPermiso,
      pedirPermisoAsync: pedirPermiso,
      programarAsync: programar,
      cancelarAsync: cancelar,
    },
    disponible,
    obtenerPermiso,
    pedirPermiso,
    programar,
    cancelar,
  } satisfies DobleNotificador;
}

function entrada(cambios: Partial<EntradaTarea> = {}): EntradaTarea {
  return {
    titulo: "Entregar informe",
    descripcion: null,
    prioridad: 2,
    vence_en: VENCE,
    ...cambios,
  };
}

function tarea(cambios: Partial<Tarea> = {}): Tarea {
  return {
    id: 1,
    titulo: "Entregar informe",
    descripcion: null,
    prioridad: 2,
    vence_en: VENCE,
    completada: false,
    notificacion_id: null,
    ...cambios,
  };
}

function dbCon(filaActual = fila({ id: 1, vence_en: VENCE })): {
  db: BaseDeDatos;
  registro: ReturnType<typeof crearBaseFalsa>["registro"];
} {
  return crearBaseFalsa({ fila: filaActual, filas: [filaActual], lastInsertRowId: 1 });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("crearTareaConRecordatorio", () => {
  it("guarda, programa y persiste el id cuando hay fecha y permiso", async () => {
    const { db, registro } = dbCon();
    const doble = dobleNotificador();

    const resultado = await crearTareaConRecordatorio(db, entrada(), doble.notificador, AHORA);

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.tarea.notificacion_id).toBe("notif-nueva");
    }
    expect(doble.programar).toHaveBeenCalledWith(
      expect.objectContaining({ tareaId: 1, fecha: new Date(2026, 10, 15, 12, 30) }),
    );
    expect(registro.ejecuciones.some((item) => item.sql.includes("notificacion_id"))).toBe(true);
    expect(registro.ejecuciones.at(-1)?.parametros).toEqual(["notif-nueva", 1]);
  });

  it("no programa nada si la tarea no tiene fecha", async () => {
    const { db } = dbCon();
    const doble = dobleNotificador();

    const resultado = await crearTareaConRecordatorio(
      db,
      entrada({ vence_en: null }),
      doble.notificador,
      AHORA,
    );

    expect(resultado.ok).toBe(true);
    expect(doble.programar).not.toHaveBeenCalled();
  });

  it("programa de inmediato cuando vence en menos de 30 minutos", async () => {
    const { db } = dbCon();
    const doble = dobleNotificador();
    const vence = new Date(2026, 10, 15, 12, 20).toISOString();

    await crearTareaConRecordatorio(db, entrada({ vence_en: vence }), doble.notificador, AHORA);

    expect(doble.programar).toHaveBeenCalledWith(
      expect.objectContaining({ fecha: new Date(AHORA.getTime() + 1000) }),
    );
  });
});

describe("crearTareaConRecordatorio · avisos", () => {
  it("guarda la tarea y avisa si el permiso está denegado", async () => {
    const { db, registro } = dbCon();
    const doble = dobleNotificador({ permiso: "denegado" });

    const resultado = await crearTareaConRecordatorio(db, entrada(), doble.notificador, AHORA);

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.aviso).toBeTruthy();
      expect(resultado.tarea.notificacion_id).toBeNull();
    }
    expect(doble.programar).not.toHaveBeenCalled();
    expect(registro.ejecuciones[0]?.sql).toContain("INSERT INTO tarea");
  });

  it("pide permiso cuando está indeterminado", async () => {
    const { db } = dbCon();
    const doble = dobleNotificador({ permiso: "indeterminado" });

    await crearTareaConRecordatorio(db, entrada(), doble.notificador, AHORA);

    expect(doble.pedirPermiso).toHaveBeenCalledTimes(1);
  });
});

describe("crearTareaConRecordatorio · disponibilidad", () => {
  it("guarda y avisa si las notificaciones no están disponibles", async () => {
    const { db } = dbCon();
    const doble = dobleNotificador({ disponible: false });

    const resultado = await crearTareaConRecordatorio(db, entrada(), doble.notificador, AHORA);

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.aviso).toBeTruthy();
    }
    expect(doble.programar).not.toHaveBeenCalled();
  });

  it("guarda y avisa si el sistema falla al programar", async () => {
    const { db } = dbCon();
    const doble = dobleNotificador();
    doble.programar.mockResolvedValueOnce(null);

    const resultado = await crearTareaConRecordatorio(db, entrada(), doble.notificador, AHORA);

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.aviso).toBeTruthy();
      expect(resultado.tarea.notificacion_id).toBeNull();
    }
  });
});

describe("alternarTareaConRecordatorio", () => {
  it("cancela y limpia el id al completar", async () => {
    const { db, registro } = dbCon(
      fila({ id: 1, vence_en: VENCE, notificacion_id: "notif-vieja" }),
    );
    const doble = dobleNotificador();

    const resultado = await alternarTareaConRecordatorio(
      db,
      tarea({ notificacion_id: "notif-vieja" }),
      doble.notificador,
      AHORA,
    );

    expect(resultado.tarea.completada).toBe(true);
    expect(resultado.tarea.notificacion_id).toBeNull();
    expect(doble.cancelar).toHaveBeenCalledWith("notif-vieja");
    expect(registro.ejecuciones.at(-1)?.parametros).toEqual([null, 1]);
  });

  it("reprograma al volver a pendiente", async () => {
    const { db } = dbCon(fila({ id: 1, vence_en: VENCE, completada: 1 }));
    const doble = dobleNotificador();

    const resultado = await alternarTareaConRecordatorio(
      db,
      tarea({ completada: true }),
      doble.notificador,
      AHORA,
    );

    expect(resultado.tarea.completada).toBe(false);
    expect(resultado.tarea.notificacion_id).toBe("notif-nueva");
    expect(doble.programar).toHaveBeenCalledTimes(1);
  });
});

describe("posponerTareaConRecordatorio", () => {
  it("pospone, cancela la anterior y reprograma", async () => {
    const { db } = dbCon();
    const doble = dobleNotificador();

    const resultado = await posponerTareaConRecordatorio(
      db,
      tarea({ vence_en: "2026-11-30", notificacion_id: "notif-vieja" }),
      doble.notificador,
      AHORA,
    );

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.tarea.vence_en).toBe("2026-12-01");
      expect(resultado.tarea.notificacion_id).toBe("notif-nueva");
    }
    expect(doble.cancelar).toHaveBeenCalledWith("notif-vieja");
    expect(doble.programar).toHaveBeenCalledTimes(1);
  });

  it("no toca SQLite y avisa si no hay fecha", async () => {
    const { db, registro } = dbCon();
    const doble = dobleNotificador();

    const resultado = await posponerTareaConRecordatorio(
      db,
      tarea({ vence_en: null }),
      doble.notificador,
      AHORA,
    );

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.aviso).toContain("no tiene fecha");
    }
    expect(registro.ejecuciones).toEqual([]);
    expect(doble.programar).not.toHaveBeenCalled();
  });
});

describe("actualizarTareaConRecordatorio", () => {
  it("cancela la anterior y reprograma al cambiar la fecha", async () => {
    const { db, registro } = dbCon(
      fila({
        id: 1,
        vence_en: new Date(2026, 10, 20, 15).toISOString(),
        notificacion_id: "notif-vieja",
      }),
    );
    const doble = dobleNotificador();
    const nuevaFecha = new Date(2026, 10, 25, 15).toISOString();

    const resultado = await actualizarTareaConRecordatorio(
      db,
      1,
      entrada({ vence_en: nuevaFecha }),
      doble.notificador,
      AHORA,
    );

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.tarea.notificacion_id).toBe("notif-nueva");
    }
    expect(doble.cancelar).toHaveBeenCalledWith("notif-vieja");
    expect(doble.programar).toHaveBeenCalledWith(
      expect.objectContaining({ fecha: new Date(2026, 10, 25, 14, 30) }),
    );
    expect(registro.ejecuciones.at(-1)?.parametros).toEqual(["notif-nueva", 1]);
  });
});

describe("actualizarTareaConRecordatorio · sin fecha", () => {
  it("conserva el id notificacion_id al actualizar y lo cancela si se quita la fecha", async () => {
    const { db } = dbCon(fila({ id: 1, notificacion_id: "notif-vieja", vence_en: VENCE }));
    const doble = dobleNotificador();

    const resultado = await actualizarTareaConRecordatorio(
      db,
      1,
      entrada({ vence_en: null }),
      doble.notificador,
      AHORA,
    );

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.tarea.notificacion_id).toBeNull();
    }
    expect(doble.cancelar).toHaveBeenCalledWith("notif-vieja");
    expect(doble.programar).not.toHaveBeenCalled();
  });
});

describe("eliminarTareaConRecordatorio", () => {
  it("cancela la notificación antes de borrar la fila", async () => {
    const { db } = dbCon(fila({ id: 1, notificacion_id: "notif-vieja" }));
    const doble = dobleNotificador();

    await expect(eliminarTareaConRecordatorio(db, 1, doble.notificador)).resolves.toBe(true);
    expect(doble.cancelar).toHaveBeenCalledWith("notif-vieja");
  });
});

describe("restaurarTareaConRecordatorio", () => {
  it("restaura una tarea completada y vuelve a programar", async () => {
    const { db } = dbCon(fila({ id: 1, completada: 1, vence_en: VENCE, notificacion_id: null }));
    const doble = dobleNotificador();

    const resultado = await restaurarTareaConRecordatorio(
      db,
      tarea({ completada: false, notificacion_id: null }),
      doble.notificador,
      AHORA,
    );

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.tarea.completada).toBe(false);
      expect(resultado.tarea.notificacion_id).toBe("notif-nueva");
    }
    expect(doble.programar).toHaveBeenCalledTimes(1);
  });

  it("avisa si la tarea ya no existe", async () => {
    const { db } = crearBaseFalsa({ fila: null });
    const doble = dobleNotificador();

    const resultado = await restaurarTareaConRecordatorio(db, tarea(), doble.notificador, AHORA);

    expect(resultado.ok).toBe(false);
  });
});
