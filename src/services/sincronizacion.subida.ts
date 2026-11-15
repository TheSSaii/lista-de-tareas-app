import type { BaseDeDatos } from "../db/tipos";
import { ErrorApi } from "../api/errores";
import {
  asignarRemoteId,
  listarPendientes,
  marcarSincronizada,
} from "../repositories/tarea.repositorio";
import { nuevoId, type GeneradorId } from "./id";
import { aPayloadApi } from "./mapeo-tareas";
import type { ApiTareas, TareaPendiente } from "./tipos-sincronizacion";

export type OpcionesSubida = {
  db: BaseDeDatos;
  api: ApiTareas;
  generarId?: GeneradorId;
  ahora?: () => string;
};

async function enviarPendiente(opciones: OpcionesSubida, tarea: TareaPendiente): Promise<string> {
  const generarId = opciones.generarId ?? nuevoId;
  const remoteId = tarea.remote_id ?? generarId();
  if (tarea.remote_id === null) {
    await asignarRemoteId(opciones.db, tarea.id, remoteId);
  }

  if (!tarea.deleted) {
    const guardada = await opciones.api.guardar(remoteId, aPayloadApi(tarea));
    return guardada.updated_at;
  }

  try {
    await opciones.api.eliminar(remoteId);
  } catch (error) {
    if (!(error instanceof ErrorApi) || error.estado !== 404) throw error;
  }

  return (opciones.ahora ?? (() => new Date().toISOString()))();
}

/** Sube en orden. Un fallo detiene el lote y conserva `pending` en las filas restantes. */
export async function subirPendientes(opciones: OpcionesSubida): Promise<number> {
  const pendientes = await listarPendientes(opciones.db);
  let subidos = 0;

  for (const tarea of pendientes) {
    const updatedAt = await enviarPendiente(opciones, tarea);
    await marcarSincronizada(opciones.db, tarea.id, updatedAt);
    subidos += 1;
  }

  return subidos;
}
