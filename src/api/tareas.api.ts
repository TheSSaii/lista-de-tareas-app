import { ErrorRespuesta } from "./errores";
import type { Solicitar } from "./cliente";
import { esTareaRemota } from "../services/mapeo-tareas";
import type {
  ApiTareas,
  ResultadoListado,
  TareaParaApi,
  TareaRemota,
} from "../services/tipos-sincronizacion";

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

function leerTarea(valor: unknown): TareaRemota {
  if (!esTareaRemota(valor)) throw new ErrorRespuesta();
  return valor;
}

function leerPagina(valor: unknown): ResultadoListado {
  if (!esObjeto(valor) || !Array.isArray(valor.items) || typeof valor.servidor_ahora !== "string") {
    throw new ErrorRespuesta();
  }

  if (!valor.items.every(esTareaRemota)) {
    throw new ErrorRespuesta();
  }

  return { items: valor.items, servidor_ahora: valor.servidor_ahora };
}

export function crearApiTareas(solicitar: Solicitar): ApiTareas {
  return {
    async listar(since) {
      const ruta =
        since === null ? "/api/tareas" : `/api/tareas?since=${encodeURIComponent(since)}`;
      return leerPagina(await solicitar<unknown>(ruta, undefined));
    },
    async guardar(id, tarea: TareaParaApi) {
      return leerTarea(
        await solicitar<unknown>(`/api/tareas/${encodeURIComponent(id)}`, {
          metodo: "PUT",
          cuerpo: tarea,
        }),
      );
    },
    async eliminar(id) {
      await solicitar<unknown>(`/api/tareas/${encodeURIComponent(id)}`, { metodo: "DELETE" });
    },
  };
}
