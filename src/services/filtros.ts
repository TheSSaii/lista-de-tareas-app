import { aFecha, inicioDelDia } from "./tarea";
import type { Tarea } from "./tarea";

export type Filtro = "hoy" | "semana" | "todas";

export type GrupoDia = { etiqueta: string; tareas: Tarea[] };

const MS_POR_DIA = 86_400_000;
const CLAVE_SIN_FECHA = Number.MAX_SAFE_INTEGER;

const FORMATO_DIA = new Intl.DateTimeFormat("es-CO", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** Días transcurridos entre dos fechas locales, sin depender de la hora ni del DST. */
function numeroDeDia(fecha: Date): number {
  return Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()) / MS_POR_DIA;
}

function etiquetaFutura(fecha: Date): string {
  const partes = FORMATO_DIA.formatToParts(fecha);
  return ["weekday", "day", "month"]
    .map((tipo) => partes.find((parte) => parte.type === tipo)?.value ?? "")
    .filter((texto) => texto.length > 0)
    .join(" ");
}

function dentroDelLimite(venceEn: string | null, limite: Date): boolean {
  if (venceEn === null) {
    return false;
  }
  const fecha = aFecha(venceEn);
  return fecha !== null && fecha.getTime() < limite.getTime();
}

function clasificar(tarea: Tarea, ahora: Date): { clave: number; etiqueta: string } {
  if (tarea.vence_en === null) {
    return { clave: CLAVE_SIN_FECHA, etiqueta: "Sin fecha" };
  }

  const fecha = aFecha(tarea.vence_en);
  if (fecha === null) {
    return { clave: CLAVE_SIN_FECHA, etiqueta: "Sin fecha" };
  }

  const dias = numeroDeDia(fecha) - numeroDeDia(ahora);
  if (dias < 0) {
    return { clave: -1, etiqueta: "Vencidas" };
  }
  if (dias === 0) {
    return { clave: 0, etiqueta: "Hoy" };
  }
  if (dias === 1) {
    return { clave: 1, etiqueta: "Mañana" };
  }
  return { clave: dias, etiqueta: etiquetaFutura(fecha) };
}

/**
 * "hoy" y "semana" nunca ocultan vencidas (RF-05). Las tareas sin fecha o con
 * fecha inválida solo aparecen en "todas".
 */
export function filtrarTareas(
  tareas: readonly Tarea[],
  filtro: Filtro,
  ahora: Date = new Date(),
): Tarea[] {
  if (filtro === "todas") {
    return [...tareas];
  }

  const dias = filtro === "hoy" ? 1 : 7;
  const inicio = inicioDelDia(ahora);
  const limite = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + dias);
  return tareas.filter((tarea) => dentroDelLimite(tarea.vence_en, limite));
}

export function agruparPorDia(tareas: readonly Tarea[], ahora: Date = new Date()): GrupoDia[] {
  const grupos = new Map<number, GrupoDia>();

  for (const tarea of tareas) {
    const { clave, etiqueta } = clasificar(tarea, ahora);
    const grupo = grupos.get(clave);
    if (grupo === undefined) {
      grupos.set(clave, { etiqueta, tareas: [tarea] });
    } else {
      grupo.tareas.push(tarea);
    }
  }

  return [...grupos.entries()]
    .sort(([claveA], [claveB]) => claveA - claveB)
    .map(([, grupo]) => grupo);
}
