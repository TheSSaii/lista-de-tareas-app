import type { BaseDeDatos } from "../db/tipos";
import { nuevoId } from "../services/id";
import type { Prioridad, Tarea } from "../services/tarea";
import type { TareaPendiente, TareaRemota } from "../services/tipos-sincronizacion";

export type FilaTarea = {
  id: number;
  titulo: string;
  descripcion: string | null;
  prioridad: number;
  vence_en: string | null;
  completada: number;
  notificacion_id: string | null;
  remote_id: string | null;
  updated_at: string | null;
  deleted: number;
  pending: number;
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

const AHORA = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
const CAMPOS = "id, titulo, descripcion, prioridad, vence_en, completada, notificacion_id";
const CAMPOS_SYNC = `${CAMPOS}, remote_id, updated_at, deleted, pending`;

const SQL_INSERTAR = `INSERT INTO tarea (titulo, descripcion, prioridad, vence_en, notificacion_id, remote_id, updated_at, pending) VALUES (?, ?, ?, ?, ?, ?, ${AHORA}, 1)`;

const SQL_LISTAR = `SELECT ${CAMPOS} FROM tarea WHERE deleted = 0`;

const SQL_OBTENER = `SELECT ${CAMPOS} FROM tarea WHERE id = ? AND deleted = 0`;

const SQL_ACTUALIZAR = `UPDATE tarea SET titulo = ?, descripcion = ?, prioridad = ?, vence_en = ?, notificacion_id = ?, updated_at = ${AHORA}, pending = 1 WHERE id = ?`;

const SQL_MARCAR_COMPLETADA = `UPDATE tarea SET completada = ?, updated_at = ${AHORA}, pending = 1 WHERE id = ?`;

const SQL_ACTUALIZAR_NOTIFICACION = "UPDATE tarea SET notificacion_id = ? WHERE id = ?";

const SQL_ELIMINAR = `UPDATE tarea SET deleted = 1, pending = 1, updated_at = ${AHORA} WHERE id = ? AND deleted = 0`;

const SQL_LISTAR_PENDIENTES = `SELECT ${CAMPOS_SYNC} FROM tarea WHERE pending = 1 ORDER BY updated_at, id`;

const SQL_OBTENER_REMOTO = `SELECT ${CAMPOS_SYNC} FROM tarea WHERE remote_id = ?`;

const SQL_ASIGNAR_REMOTO = "UPDATE tarea SET remote_id = ? WHERE id = ?";

const SQL_INSERTAR_REMOTO = `INSERT INTO tarea (titulo, descripcion, prioridad, vence_en, completada, notificacion_id, remote_id, updated_at, deleted, pending) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, 0)`;

const SQL_ACTUALIZAR_REMOTO = `UPDATE tarea SET titulo = ?, descripcion = ?, prioridad = ?, vence_en = ?, completada = ?, updated_at = ?, deleted = ?, pending = 0 WHERE id = ?`;

const SQL_MARCAR_SINCRONIZADA = "UPDATE tarea SET pending = 0, updated_at = ? WHERE id = ?";

const SQL_CONTAR_PENDIENTES = "SELECT COUNT(*) AS total FROM tarea WHERE pending = 1";

const SQL_CONTAR_TAREAS = "SELECT COUNT(*) AS total FROM tarea WHERE deleted = 0";

const SQL_BORRAR_TODAS = "DELETE FROM tarea";

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

function desenvolverPendiente(fila: FilaTarea): TareaPendiente {
  return {
    ...desenvolver(fila),
    remote_id: fila.remote_id,
    updated_at: fila.updated_at,
    deleted: fila.deleted === 1,
    pending: fila.pending === 1,
  };
}

export async function crear(
  db: BaseDeDatos,
  datos: DatosTarea,
  remoteId: string = nuevoId(),
): Promise<Tarea> {
  const resultado = await db.runAsync(SQL_INSERTAR, [
    datos.titulo,
    datos.descripcion,
    datos.prioridad,
    datos.vence_en,
    datos.notificacion_id,
    remoteId,
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

/** Es local: no marca `pending` ni cambia `updated_at`. */
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

export async function listarPendientes(db: BaseDeDatos): Promise<TareaPendiente[]> {
  const filas = await db.getAllAsync<FilaTarea>(SQL_LISTAR_PENDIENTES, []);
  return filas.map(desenvolverPendiente);
}

export async function obtenerPorRemoteId(
  db: BaseDeDatos,
  remoteId: string,
): Promise<TareaPendiente | null> {
  const fila = await db.getFirstAsync<FilaTarea>(SQL_OBTENER_REMOTO, [remoteId]);
  return fila === null ? null : desenvolverPendiente(fila);
}

export async function asignarRemoteId(
  db: BaseDeDatos,
  id: number,
  remoteId: string,
): Promise<boolean> {
  const resultado = await db.runAsync(SQL_ASIGNAR_REMOTO, [remoteId, id]);
  return resultado.changes > 0;
}

export async function insertarRemoto(db: BaseDeDatos, remoto: TareaRemota): Promise<number> {
  const resultado = await db.runAsync(SQL_INSERTAR_REMOTO, [
    remoto.titulo,
    remoto.descripcion,
    remoto.prioridad,
    remoto.vence_en,
    remoto.completada ? 1 : 0,
    remoto.id,
    remoto.updated_at,
    remoto.deleted_at === null ? 0 : 1,
  ]);

  return resultado.lastInsertRowId;
}

export async function actualizarRemoto(
  db: BaseDeDatos,
  id: number,
  remoto: TareaRemota,
): Promise<boolean> {
  const resultado = await db.runAsync(SQL_ACTUALIZAR_REMOTO, [
    remoto.titulo,
    remoto.descripcion,
    remoto.prioridad,
    remoto.vence_en,
    remoto.completada ? 1 : 0,
    remoto.updated_at,
    remoto.deleted_at === null ? 0 : 1,
    id,
  ]);

  return resultado.changes > 0;
}

export async function marcarSincronizada(
  db: BaseDeDatos,
  id: number,
  updatedAt: string,
): Promise<boolean> {
  const resultado = await db.runAsync(SQL_MARCAR_SINCRONIZADA, [updatedAt, id]);
  return resultado.changes > 0;
}

export async function contarPendientes(db: BaseDeDatos): Promise<number> {
  const fila = await db.getFirstAsync<{ total: number }>(SQL_CONTAR_PENDIENTES, []);
  return fila?.total ?? 0;
}

export async function contarTareas(db: BaseDeDatos): Promise<number> {
  const fila = await db.getFirstAsync<{ total: number }>(SQL_CONTAR_TAREAS, []);
  return fila?.total ?? 0;
}

export async function borrarTodasLasTareas(db: BaseDeDatos): Promise<void> {
  await db.runAsync(SQL_BORRAR_TODAS, []);
}
