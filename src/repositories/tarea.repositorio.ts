import type { BaseDeDatos } from "../db/tipos";
import type { Prioridad, Tarea } from "../services/tarea";

export type FilaTarea = {
  id: number;
  titulo: string;
  descripcion: string | null;
  prioridad: number;
  vence_en: string | null;
  completada: number;
  notificacion_id: string | null;
};

/** Campos editables. El id nunca se actualiza y completada tiene su propia función. */
export type DatosTarea = {
  titulo: string;
  descripcion: string | null;
  prioridad: Prioridad;
  vence_en: string | null;
  notificacion_id: string | null;
};

export type ResultadoFila = { ok: true; tarea: Tarea } | { ok: false; error: Error };

const SQL_INSERTAR =
  "INSERT INTO tarea (titulo, descripcion, prioridad, vence_en, notificacion_id) VALUES (?, ?, ?, ?, ?)";

const SQL_LISTAR =
  "SELECT id, titulo, descripcion, prioridad, vence_en, completada, notificacion_id FROM tarea";

const SQL_OBTENER =
  "SELECT id, titulo, descripcion, prioridad, vence_en, completada, notificacion_id FROM tarea WHERE id = ?";

const SQL_ACTUALIZAR =
  "UPDATE tarea SET titulo = ?, descripcion = ?, prioridad = ?, vence_en = ?, notificacion_id = ? WHERE id = ?";

const SQL_MARCAR_COMPLETADA = "UPDATE tarea SET completada = ? WHERE id = ?";

const SQL_ACTUALIZAR_NOTIFICACION = "UPDATE tarea SET notificacion_id = ? WHERE id = ?";

const SQL_ELIMINAR = "DELETE FROM tarea WHERE id = ?";

function esPrioridad(valor: number): valor is Prioridad {
  return Number.isInteger(valor) && valor >= 1 && valor <= 3;
}

/** Mapeo puro de fila SQLite a dominio; no oculta una prioridad inválida. */
export function filaATarea(fila: FilaTarea): ResultadoFila {
  if (!esPrioridad(fila.prioridad)) {
    return { ok: false, error: new Error(`prioridad inválida: ${fila.prioridad}`) };
  }

  return {
    ok: true,
    tarea: {
      id: fila.id,
      titulo: fila.titulo,
      descripcion: fila.descripcion,
      prioridad: fila.prioridad,
      vence_en: fila.vence_en,
      completada: fila.completada === 1,
      notificacion_id: fila.notificacion_id,
    },
  };
}

function desenvolver(fila: FilaTarea): Tarea {
  const resultado = filaATarea(fila);
  if (!resultado.ok) {
    throw new Error(`fila de tarea inválida: id=${fila.id}`);
  }
  return resultado.tarea;
}

export async function crear(db: BaseDeDatos, datos: DatosTarea): Promise<Tarea> {
  const resultado = await db.runAsync(SQL_INSERTAR, [
    datos.titulo,
    datos.descripcion,
    datos.prioridad,
    datos.vence_en,
    datos.notificacion_id,
  ]);

  return {
    id: resultado.lastInsertRowId,
    titulo: datos.titulo,
    descripcion: datos.descripcion,
    prioridad: datos.prioridad,
    vence_en: datos.vence_en,
    completada: false,
    notificacion_id: datos.notificacion_id,
  };
}

export async function listar(db: BaseDeDatos): Promise<Tarea[]> {
  const filas = await db.getAllAsync<FilaTarea>(SQL_LISTAR, []);
  return filas.map(desenvolver);
}

export async function obtener(db: BaseDeDatos, id: number): Promise<Tarea | null> {
  const fila = await db.getFirstAsync<FilaTarea>(SQL_OBTENER, [id]);
  return fila === null ? null : desenvolver(fila);
}

export async function actualizar(db: BaseDeDatos, id: number, datos: DatosTarea): Promise<boolean> {
  const resultado = await db.runAsync(SQL_ACTUALIZAR, [
    datos.titulo,
    datos.descripcion,
    datos.prioridad,
    datos.vence_en,
    datos.notificacion_id,
    id,
  ]);

  return resultado.changes > 0;
}

export async function marcarCompletada(
  db: BaseDeDatos,
  id: number,
  completada: boolean,
): Promise<boolean> {
  const resultado = await db.runAsync(SQL_MARCAR_COMPLETADA, [completada ? 1 : 0, id]);
  return resultado.changes > 0;
}

export async function actualizarNotificacion(
  db: BaseDeDatos,
  id: number,
  notificacionId: string | null,
): Promise<boolean> {
  const resultado = await db.runAsync(SQL_ACTUALIZAR_NOTIFICACION, [notificacionId, id]);
  return resultado.changes > 0;
}

export async function eliminar(db: BaseDeDatos, id: number): Promise<boolean> {
  const resultado = await db.runAsync(SQL_ELIMINAR, [id]);
  return resultado.changes > 0;
}
