import type { BaseDeDatos } from "../db/tipos";
import {
  actualizarNotificacion,
  actualizarRemoto,
  insertarRemoto,
  obtenerPorRemoteId,
} from "../repositories/tarea.repositorio";
import { decidirConflicto } from "./conflictos";
import { esTareaRemota } from "./mapeo-tareas";
import type { Notificador } from "./notificaciones";
import { reconciliarRecordatorio } from "./recordatorios.servicio";
import type { Tarea } from "./tarea";
import type { ApiTareas, TareaPendiente, TareaRemota } from "./tipos-sincronizacion";

export const LIMITE_PAGINA = 500;
export const MAX_PAGINAS = 20;

export type OpcionesBajada = {
  db: BaseDeDatos;
  api: ApiTareas;
  cursor: string | null;
  notificador: Notificador;
  ahora?: Date;
};

export type ResultadoBajada = {
  cursor: string | null;
  bajados: number;
  aviso?: string;
};

type Aplicada = {
  localId: number;
  anterior: TareaPendiente | null;
  remoto: TareaRemota;
};

function instante(texto: string): number | null {
  const valor = Date.parse(texto);
  return Number.isFinite(valor) ? valor : null;
}

function avanzarCursor(actual: string | null, ultimo: string): string | null {
  const fecha = instante(ultimo);
  if (fecha === null) return actual;
  if (actual === null) return ultimo;
  const anterior = instante(actual);
  return anterior === null || fecha > anterior ? ultimo : actual;
}

function aTarea(localId: number, remoto: TareaRemota, anterior: TareaPendiente | null): Tarea {
  return {
    id: localId,
    titulo: remoto.titulo,
    descripcion: remoto.descripcion,
    prioridad: remoto.prioridad,
    vence_en: remoto.vence_en,
    completada: remoto.completada,
    notificacion_id: anterior?.notificacion_id ?? null,
  };
}

async function reconciliarAplicada(
  opciones: OpcionesBajada,
  aplicada: Aplicada,
): Promise<string | undefined> {
  const { remoto, anterior, localId } = aplicada;

  if (remoto.deleted_at !== null || remoto.completada) {
    if (anterior?.notificacion_id != null) {
      await opciones.notificador.cancelarAsync(anterior.notificacion_id);
    }
    await actualizarNotificacion(opciones.db, localId, null);
    return undefined;
  }

  const resultado = await reconciliarRecordatorio(
    opciones.db,
    aTarea(localId, remoto, anterior),
    opciones.notificador,
    opciones.ahora ?? new Date(),
  );
  return resultado.aviso;
}

async function reconciliarAplicadas(
  opciones: OpcionesBajada,
  aplicadas: readonly Aplicada[],
): Promise<string | undefined> {
  let aviso: string | undefined;
  for (const aplicada of aplicadas) {
    const actual = await reconciliarAplicada(opciones, aplicada);
    if (aviso === undefined) aviso = actual;
  }
  return aviso;
}

async function aplicarUno(
  opciones: OpcionesBajada,
  remoto: TareaRemota,
  invalidos: { total: number },
): Promise<Aplicada | null> {
  if (!esTareaRemota(remoto)) {
    invalidos.total += 1;
    return null;
  }

  const anterior = await obtenerPorRemoteId(opciones.db, remoto.id);
  const decision =
    anterior === null
      ? "aplicar"
      : decidirConflicto(anterior, {
          updated_at: remoto.updated_at,
          borrado: remoto.deleted_at !== null,
        });
  if (decision !== "aplicar") return null;

  const localId = anterior === null ? await insertarRemoto(opciones.db, remoto) : anterior.id;
  if (anterior !== null) {
    await actualizarRemoto(opciones.db, anterior.id, remoto);
  }
  return { localId, anterior, remoto };
}

async function aplicarPagina(
  opciones: OpcionesBajada,
  remotos: readonly TareaRemota[],
  invalidos: { total: number },
): Promise<Aplicada[]> {
  const aplicadas: Aplicada[] = [];
  await opciones.db.execAsync("BEGIN");

  try {
    for (const remoto of remotos) {
      const aplicada = await aplicarUno(opciones, remoto, invalidos);
      if (aplicada !== null) aplicadas.push(aplicada);
    }
    await opciones.db.execAsync("COMMIT");
    return aplicadas;
  } catch (error) {
    await opciones.db.execAsync("ROLLBACK");
    throw error;
  }
}

function noAvanzo(cursor: string | null, siguiente: string | null, cantidad: number): boolean {
  return siguiente === cursor && cantidad >= LIMITE_PAGINA;
}

function combinarAviso(aviso: string | undefined, invalidos: number): string | undefined {
  if (invalidos === 0) return aviso;
  const mensaje = `Se omitieron ${invalidos} cambios con formato inválido.`;
  return aviso === undefined ? mensaje : `${aviso} ${mensaje}`;
}

/**
 * Límite conocido: la API filtra con `updated_at > since`. Si una página
 * completa no avanza el cursor, se detiene y lo reporta en vez de fingir que
 * bajó todo. La mejora pendiente es un desempate por `id` en la API.
 */
export async function bajarCambios(opciones: OpcionesBajada): Promise<ResultadoBajada> {
  let cursor = opciones.cursor;
  let bajados = 0;
  let aviso: string | undefined;
  const invalidos = { total: 0 };

  for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {
    const datos = await opciones.api.listar(cursor);
    if (datos.items.length === 0) {
      cursor = cursor ?? datos.servidor_ahora;
      break;
    }

    const aplicadas = await aplicarPagina(opciones, datos.items, invalidos);
    bajados += aplicadas.length;
    aviso = (await reconciliarAplicadas(opciones, aplicadas)) ?? aviso;

    const ultimo = datos.items[datos.items.length - 1];
    const siguiente = avanzarCursor(cursor, ultimo?.updated_at ?? "");
    if (noAvanzo(cursor, siguiente, datos.items.length)) {
      aviso = "La sincronización se detuvo porque el cursor no avanzó.";
      break;
    }
    cursor = siguiente;
    if (datos.items.length < LIMITE_PAGINA) break;
  }

  return {
    cursor,
    bajados,
    ...(combinarAviso(aviso, invalidos.total) === undefined
      ? {}
      : {
          aviso: combinarAviso(aviso, invalidos.total),
        }),
  };
}
