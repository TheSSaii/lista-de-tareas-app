import { aFecha } from "../services/tarea";
import type { Tarea } from "../services/tarea";
import type { EntradaTarea } from "../services/tareas.servicio";

export type ValoresFormulario = {
  titulo: string;
  descripcion: string;
  prioridad: number | null;
  venceEn: Date | null;
};

export function valoresIniciales(): ValoresFormulario {
  return {
    titulo: "",
    descripcion: "",
    prioridad: null,
    venceEn: null,
  };
}

export function valoresDesdeTarea(tarea: Tarea): ValoresFormulario {
  return {
    titulo: tarea.titulo,
    descripcion: tarea.descripcion ?? "",
    prioridad: tarea.prioridad,
    venceEn: tarea.vence_en === null ? null : aFecha(tarea.vence_en),
  };
}

export function entradaDesdeValores(valores: ValoresFormulario): EntradaTarea {
  const descripcion = valores.descripcion.trim();

  return {
    titulo: valores.titulo.trim(),
    descripcion: descripcion.length === 0 ? null : descripcion,
    prioridad: valores.prioridad ?? 0,
    vence_en: valores.venceEn === null ? null : valores.venceEn.toISOString(),
    notificacion_id: null,
  };
}
