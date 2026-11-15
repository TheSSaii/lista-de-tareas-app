import type { Prioridad, Tarea } from "./tarea";

export type TareaRemota = {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: Prioridad;
  vence_en: string | null;
  completada: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TareaParaApi = {
  titulo: string;
  descripcion: string | null;
  prioridad: Prioridad;
  vence_en: string | null;
  completada: boolean;
};

export type TareaPendiente = Tarea & {
  remote_id: string | null;
  updated_at: string | null;
  deleted: boolean;
  pending: boolean;
};

export type ResultadoListado = {
  items: TareaRemota[];
  servidor_ahora: string;
};

export type ApiTareas = {
  listar: (since: string | null) => Promise<ResultadoListado>;
  guardar: (id: string, tarea: TareaParaApi) => Promise<TareaRemota>;
  eliminar: (id: string) => Promise<void>;
};

export type EstadoSincronizacion =
  "inactivo" | "sincronizando" | "al-dia" | "pendiente" | "sin-conexion" | "error";

export type ResultadoSincronizacion = {
  estado: EstadoSincronizacion;
  subidos: number;
  bajados: number;
  pendientes: number;
  ultimaSync: string | null;
  aviso?: string;
};
