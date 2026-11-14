import type { BaseDeDatos } from "../db/tipos";
import {
  actualizar,
  crear,
  eliminar,
  listar,
  marcarCompletada,
  obtener,
} from "../repositories/tarea.repositorio";
import type { DatosTarea } from "../repositories/tarea.repositorio";
import { aFecha, esPrioridadValida, ordenarTareas, sumarUnDia, validarTarea } from "./tarea";
import type { EntradaValidable, ErroresTarea, Tarea } from "./tarea";

export type EntradaTarea = {
  titulo: string;
  descripcion: string | null;
  prioridad: number;
  vence_en: string | null;
  notificacion_id: string | null;
};

export type ResultadoGuardado =
  { ok: true; tarea: Tarea } | { ok: false; errores: ErroresTarea; error?: string };

const TAREA_INEXISTENTE = "La tarea no existe.";

function hayErrores(errores: ErroresTarea): boolean {
  return Object.keys(errores).length > 0;
}

function datosDesdeEntrada(entrada: EntradaTarea): DatosTarea {
  if (!esPrioridadValida(entrada.prioridad)) {
    throw new Error("prioridad inválida: la validación debió rechazarla.");
  }

  return {
    titulo: entrada.titulo,
    descripcion: entrada.descripcion,
    prioridad: entrada.prioridad,
    vence_en: entrada.vence_en,
    notificacion_id: entrada.notificacion_id,
  };
}

function datosDesdeTarea(tarea: Tarea, venceEn: string): DatosTarea {
  return {
    titulo: tarea.titulo,
    descripcion: tarea.descripcion,
    prioridad: tarea.prioridad,
    vence_en: venceEn,
    notificacion_id: tarea.notificacion_id,
  };
}

export async function crearTarea(
  db: BaseDeDatos,
  entrada: EntradaTarea,
  ahora: Date = new Date(),
): Promise<ResultadoGuardado> {
  const errores = validarTarea(entrada, ahora);
  if (hayErrores(errores)) {
    return { ok: false, errores };
  }

  const tarea = await crear(db, datosDesdeEntrada(entrada));
  return { ok: true, tarea };
}

/**
 * Compara por instante, no por texto: el formulario reenvía la fecha como ISO, así que
 * "2026-11-10" y "2026-11-10T05:00:00.000Z" son la misma fecha y no deben revalidarse.
 */
function mismoInstante(a: string | null, b: string | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }

  const fechaA = aFecha(a);
  const fechaB = aFecha(b);
  if (fechaA === null || fechaB === null) {
    return a === b;
  }

  return fechaA.getTime() === fechaB.getTime();
}

/**
 * Una tarea vencida tiene, por definición, una fecha pasada. Si la fecha no cambia,
 * no se revalida su pasado: si no, no se podría corregir el título de una vencida.
 */
function validableParaActualizar(entrada: EntradaTarea, existente: Tarea): EntradaValidable {
  return {
    titulo: entrada.titulo,
    prioridad: entrada.prioridad,
    vence_en: mismoInstante(entrada.vence_en, existente.vence_en) ? null : entrada.vence_en,
  };
}

export async function actualizarTarea(
  db: BaseDeDatos,
  id: number,
  entrada: EntradaTarea,
  ahora: Date = new Date(),
): Promise<ResultadoGuardado> {
  const existente = await obtener(db, id);
  if (existente === null) {
    return { ok: false, errores: {}, error: TAREA_INEXISTENTE };
  }

  const errores = validarTarea(validableParaActualizar(entrada, existente), ahora);
  if (hayErrores(errores)) {
    return { ok: false, errores };
  }

  const datos = datosDesdeEntrada(entrada);
  await actualizar(db, id, datos);
  return { ok: true, tarea: { ...existente, ...datos } };
}

export async function alternarCompletada(db: BaseDeDatos, tarea: Tarea): Promise<Tarea> {
  const completada = !tarea.completada;
  await marcarCompletada(db, tarea.id, completada);
  return { ...tarea, completada };
}

export async function posponerUnDia(db: BaseDeDatos, tarea: Tarea): Promise<boolean> {
  if (tarea.vence_en === null) {
    return false;
  }

  let venceEn: string;
  try {
    venceEn = sumarUnDia(tarea.vence_en);
  } catch {
    return false;
  }

  await actualizar(db, tarea.id, datosDesdeTarea(tarea, venceEn));
  return true;
}

export async function eliminarTarea(db: BaseDeDatos, id: number): Promise<boolean> {
  return eliminar(db, id);
}

export async function listarTareas(db: BaseDeDatos, ahora: Date = new Date()): Promise<Tarea[]> {
  return ordenarTareas(await listar(db), ahora);
}
