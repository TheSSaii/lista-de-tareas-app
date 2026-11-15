import type { BaseDeDatos } from "../db/tipos";
import { borrarTodasLasTareas, contarTareas } from "../repositories/tarea.repositorio";
import {
  CLAVE_USUARIO,
  guardarMeta,
  leerMeta,
  limpiarSincronizacion,
} from "../repositories/sincronizacion.repositorio";

/** Hay datos de la etapa sin login si no hay usuario asociado y existen tareas. */
export async function hayDatosLocales(db: BaseDeDatos): Promise<boolean> {
  const usuario = await leerMeta(db, CLAVE_USUARIO);
  if (usuario !== null) return false;
  return (await contarTareas(db)) > 0;
}

/** Purga tareas y metadatos en una transacción. Solo se llama tras confirmar. */
export async function descartarDatosLocales(db: BaseDeDatos): Promise<void> {
  await db.execAsync("BEGIN");
  try {
    await borrarTodasLasTareas(db);
    await limpiarSincronizacion(db);
    await db.execAsync("COMMIT");
  } catch (error) {
    await db.execAsync("ROLLBACK");
    throw error;
  }
}

/**
 * Asocia la base al usuario. Si había otra cuenta o datos sin dueño, purga
 * primero para no mezclar tareas entre sesiones.
 */
export async function prepararCuenta(db: BaseDeDatos, usuarioId: string): Promise<boolean> {
  const actual = await leerMeta(db, CLAVE_USUARIO);
  const hayTareas = (await contarTareas(db)) > 0;
  const requierePurga = actual !== usuarioId && (actual !== null || hayTareas);

  if (requierePurga) {
    await descartarDatosLocales(db);
  }

  await guardarMeta(db, CLAVE_USUARIO, usuarioId);
  return requierePurga;
}

export async function cerrarCuenta(db: BaseDeDatos): Promise<void> {
  await descartarDatosLocales(db);
}
