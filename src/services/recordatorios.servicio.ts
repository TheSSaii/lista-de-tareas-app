import type { BaseDeDatos } from "../db/tipos";
import {
  actualizar,
  actualizarNotificacion,
  marcarCompletada,
  obtener,
} from "../repositories/tarea.repositorio";
import type { Notificador } from "./notificaciones";
import { calcularDisparo, mensajeRecordatorio } from "./recordatorio";
import type { Tarea } from "./tarea";
import {
  actualizarTarea,
  alternarCompletada,
  crearTarea,
  eliminarTarea,
  posponerUnDia,
} from "./tareas.servicio";
import type { EntradaTarea, ResultadoGuardado } from "./tareas.servicio";

export const AVISO_SIN_FECHA = "Esta tarea no tiene fecha; edítala para asignar una.";
export const AVISO_SIN_PERMISO =
  "La tarea se guardó, pero no hay permiso para mostrar recordatorios.";
export const AVISO_NO_DISPONIBLE =
  "La tarea se guardó, pero las notificaciones no están disponibles en este dispositivo.";
export const AVISO_SIN_PROGRAMAR = "La tarea se guardó, pero no se pudo programar el recordatorio.";
export const AVISO_SIN_GUARDAR_ID =
  "La tarea se guardó, pero no se pudo registrar el recordatorio.";
export const AVISO_TAREA_INEXISTENTE = "La tarea ya no existe.";
export const AVISO_RESTAURAR = "No se pudo deshacer la última acción.";

export type ResultadoProgramacion = { tarea: Tarea; aviso?: string };
export type ResultadoAccion =
  { ok: true; tarea: Tarea; aviso?: string } | { ok: false; aviso: string };

type ResultadoPermiso = { permitido: true } | { permitido: false; aviso: string };

async function comprobarPermiso(notificador: Notificador): Promise<ResultadoPermiso> {
  const inicial = await notificador.obtenerPermisoAsync();
  const estado = inicial === "indeterminado" ? await notificador.pedirPermisoAsync() : inicial;

  if (estado === "concedido") {
    return { permitido: true };
  }

  return { permitido: false, aviso: AVISO_SIN_PERMISO };
}

async function guardarNotificacion(
  db: BaseDeDatos,
  tarea: Tarea,
  notificacionId: string,
  notificador: Notificador,
): Promise<ResultadoProgramacion> {
  try {
    await actualizarNotificacion(db, tarea.id, notificacionId);
    return { tarea: { ...tarea, notificacion_id: notificacionId } };
  } catch {
    await notificador.cancelarAsync(notificacionId);
    return { tarea, aviso: AVISO_SIN_GUARDAR_ID };
  }
}

async function programarRecordatorio(
  db: BaseDeDatos,
  tarea: Tarea,
  notificador: Notificador,
  ahora: Date,
): Promise<ResultadoProgramacion> {
  if (tarea.vence_en === null || tarea.completada) {
    return { tarea };
  }

  const disparo = calcularDisparo(tarea.vence_en, ahora);
  if (disparo.tipo === "ninguno") {
    return { tarea };
  }

  const disponible = await notificador.isAvailableAsync();
  if (!disponible) {
    return { tarea, aviso: AVISO_NO_DISPONIBLE };
  }

  const permiso = await comprobarPermiso(notificador);
  if (!permiso.permitido) {
    return { tarea, aviso: permiso.aviso };
  }

  const notificacionId = await notificador.programarAsync({
    tareaId: tarea.id,
    titulo: `Recordatorio: ${tarea.titulo}`,
    cuerpo: mensajeRecordatorio(tarea.vence_en),
    fecha: disparo.fecha,
  });

  if (notificacionId === null) {
    return { tarea, aviso: AVISO_SIN_PROGRAMAR };
  }

  return guardarNotificacion(db, tarea, notificacionId, notificador);
}

async function cancelarRecordatorio(
  db: BaseDeDatos,
  tarea: Tarea,
  notificador: Notificador,
): Promise<Tarea> {
  if (tarea.notificacion_id === null) {
    return tarea;
  }

  await notificador.cancelarAsync(tarea.notificacion_id);
  try {
    await actualizarNotificacion(db, tarea.id, null);
  } catch {
    return { ...tarea, notificacion_id: null };
  }

  return { ...tarea, notificacion_id: null };
}

function resultadoConAviso(tarea: Tarea, aviso: string | undefined): ResultadoGuardado {
  return aviso === undefined ? { ok: true, tarea } : { ok: true, tarea, aviso };
}

export async function crearTareaConRecordatorio(
  db: BaseDeDatos,
  entrada: EntradaTarea,
  notificador: Notificador,
  ahora: Date = new Date(),
): Promise<ResultadoGuardado> {
  const resultado = await crearTarea(db, entrada, ahora);
  if (!resultado.ok) {
    return resultado;
  }

  const programado = await programarRecordatorio(db, resultado.tarea, notificador, ahora);
  return resultadoConAviso(programado.tarea, programado.aviso);
}

export async function actualizarTareaConRecordatorio(
  db: BaseDeDatos,
  id: number,
  entrada: EntradaTarea,
  notificador: Notificador,
  ahora: Date = new Date(),
): Promise<ResultadoGuardado> {
  const resultado = await actualizarTarea(db, id, entrada, ahora);
  if (!resultado.ok) {
    return resultado;
  }

  const sinAviso = await cancelarRecordatorio(db, resultado.tarea, notificador);
  const programado = await programarRecordatorio(db, sinAviso, notificador, ahora);
  return resultadoConAviso(programado.tarea, programado.aviso);
}

export async function alternarTareaConRecordatorio(
  db: BaseDeDatos,
  tarea: Tarea,
  notificador: Notificador,
  ahora: Date = new Date(),
): Promise<ResultadoProgramacion> {
  const actualizada = await alternarCompletada(db, tarea);

  if (actualizada.completada) {
    return { tarea: await cancelarRecordatorio(db, actualizada, notificador) };
  }

  return programarRecordatorio(db, actualizada, notificador, ahora);
}

export async function posponerTareaConRecordatorio(
  db: BaseDeDatos,
  tarea: Tarea,
  notificador: Notificador,
  ahora: Date = new Date(),
): Promise<ResultadoAccion> {
  const pospuesta = await posponerUnDia(db, tarea);
  if (pospuesta === null) {
    return { ok: false, aviso: AVISO_SIN_FECHA };
  }

  const sinAviso = await cancelarRecordatorio(db, pospuesta, notificador);
  const programado = await programarRecordatorio(db, sinAviso, notificador, ahora);
  return { ok: true, tarea: programado.tarea, aviso: programado.aviso };
}

export async function eliminarTareaConRecordatorio(
  db: BaseDeDatos,
  id: number,
  notificador: Notificador,
): Promise<boolean> {
  const tarea = await obtener(db, id);
  const eliminada = await eliminarTarea(db, id);

  if (eliminada && tarea !== null && tarea.notificacion_id !== null) {
    await notificador.cancelarAsync(tarea.notificacion_id);
  }

  return eliminada;
}

function datosParaRestaurar(tarea: Tarea) {
  return {
    titulo: tarea.titulo,
    descripcion: tarea.descripcion,
    prioridad: tarea.prioridad,
    vence_en: tarea.vence_en,
    notificacion_id: null,
  };
}

/**
 * Reconcilia un cambio que llegó de la API. No marca `pending`: la notificación
 * es local y el repositorio solo toca `notificacion_id`.
 */
export async function reconciliarRecordatorio(
  db: BaseDeDatos,
  tarea: Tarea,
  notificador: Notificador,
  ahora: Date = new Date(),
): Promise<ResultadoProgramacion> {
  const sinAviso = await cancelarRecordatorio(db, tarea, notificador);
  return programarRecordatorio(db, sinAviso, notificador, ahora);
}

export async function restaurarTareaConRecordatorio(
  db: BaseDeDatos,
  anterior: Tarea,
  notificador: Notificador,
  ahora: Date = new Date(),
): Promise<ResultadoAccion> {
  const actual = await obtener(db, anterior.id);
  if (actual === null) {
    return { ok: false, aviso: AVISO_TAREA_INEXISTENTE };
  }

  await cancelarRecordatorio(db, actual, notificador);

  try {
    await actualizar(db, anterior.id, datosParaRestaurar(anterior));
    await marcarCompletada(db, anterior.id, anterior.completada);
  } catch {
    return { ok: false, aviso: AVISO_RESTAURAR };
  }

  const restaurada = { ...anterior, notificacion_id: null };
  if (anterior.completada) {
    return { ok: true, tarea: restaurada };
  }

  const programado = await programarRecordatorio(db, restaurada, notificador, ahora);
  return { ok: true, tarea: programado.tarea, aviso: programado.aviso };
}
