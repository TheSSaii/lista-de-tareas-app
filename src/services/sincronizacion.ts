import type { BaseDeDatos } from "../db/tipos";
import { contarPendientes } from "../repositories/tarea.repositorio";
import {
  CLAVE_SINCE,
  CLAVE_ULTIMA_SYNC,
  guardarMeta,
  leerMeta,
} from "../repositories/sincronizacion.repositorio";
import type { Notificador } from "./notificaciones";
import { bajarCambios } from "./sincronizacion.bajada";
import { subirPendientes } from "./sincronizacion.subida";
import type { ApiTareas, ResultadoSincronizacion } from "./tipos-sincronizacion";

export type OpcionesSincronizacion = {
  db: BaseDeDatos;
  api: ApiTareas;
  notificador: Notificador;
  ahora?: Date;
};

export async function sincronizar(
  opciones: OpcionesSincronizacion,
): Promise<ResultadoSincronizacion> {
  const ahora = opciones.ahora ?? new Date();
  const cursor = await leerMeta(opciones.db, CLAVE_SINCE);

  const subidos = await subirPendientes({
    db: opciones.db,
    api: opciones.api,
    ahora: () => ahora.toISOString(),
  });

  const bajada = await bajarCambios({
    db: opciones.db,
    api: opciones.api,
    cursor,
    notificador: opciones.notificador,
    ahora,
  });

  if (bajada.cursor !== null && bajada.cursor !== cursor) {
    await guardarMeta(opciones.db, CLAVE_SINCE, bajada.cursor);
  }

  const ultimaSync = ahora.toISOString();
  await guardarMeta(opciones.db, CLAVE_ULTIMA_SYNC, ultimaSync);
  const pendientes = await contarPendientes(opciones.db);

  return {
    estado: pendientes > 0 ? "pendiente" : "al-dia",
    subidos,
    bajados: bajada.bajados,
    pendientes,
    ultimaSync,
    ...(bajada.aviso === undefined ? {} : { aviso: bajada.aviso }),
  };
}
