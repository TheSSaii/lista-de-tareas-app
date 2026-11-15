import { esPrioridadValida } from "./tarea";
import type { TareaParaApi, TareaPendiente, TareaRemota } from "./tipos-sincronizacion";

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

function esTextoONull(valor: unknown): valor is string | null {
  return valor === null || typeof valor === "string";
}

function esIdentificador(valor: unknown): boolean {
  return typeof valor === "string" && valor !== "";
}

function esCamposTexto(valor: Record<string, unknown>): boolean {
  return (
    typeof valor.titulo === "string" &&
    esTextoONull(valor.descripcion) &&
    esTextoONull(valor.vence_en)
  );
}

function esFechas(valor: Record<string, unknown>): boolean {
  return (
    typeof valor.created_at === "string" &&
    typeof valor.updated_at === "string" &&
    esTextoONull(valor.deleted_at)
  );
}

export function esTareaRemota(valor: unknown): valor is TareaRemota {
  if (!esObjeto(valor)) return false;
  if (!esIdentificador(valor.id)) return false;
  if (!esCamposTexto(valor)) return false;
  if (!esFechas(valor)) return false;
  if (typeof valor.prioridad !== "number" || !esPrioridadValida(valor.prioridad)) return false;
  return typeof valor.completada === "boolean";
}

/** Lista blanca: `notificacion_id`, `remote_id`, `pending` y `deleted` no viajan. */
export function aPayloadApi(tarea: TareaPendiente): TareaParaApi {
  return {
    titulo: tarea.titulo,
    descripcion: tarea.descripcion,
    prioridad: tarea.prioridad,
    vence_en: tarea.vence_en,
    completada: tarea.completada,
  };
}
