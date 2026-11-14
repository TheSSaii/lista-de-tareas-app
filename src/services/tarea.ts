export type Prioridad = 1 | 2 | 3;

export type Tarea = {
  id: number;
  titulo: string;
  descripcion: string | null;
  prioridad: Prioridad;
  vence_en: string | null;
  completada: boolean;
  notificacion_id: string | null;
};

export type EntradaValidable = {
  titulo: string;
  prioridad: number;
  vence_en: string | null;
};

export type ErroresTarea = Partial<Record<"titulo" | "prioridad" | "vence_en", string>>;

const TITULO_MINIMO = 3;
const TITULO_MAXIMO = 100;
const PATRON_SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Convierte `vence_en` a Date. Las fechas sin hora se interpretan a
 * medianoche LOCAL para no desplazarlas al día anterior en husos negativos.
 */
function aFecha(venceEn: string): Date | null {
  const partes = PATRON_SOLO_FECHA.exec(venceEn);
  if (partes === null) {
    const fecha = new Date(venceEn);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }
  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const fecha = new Date(anio, mes - 1, dia);
  const esFechaReal =
    fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
  return esFechaReal ? fecha : null;
}

function inicioDelDia(ahora: Date): Date {
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

function esPrioridadValida(prioridad: number): prioridad is Prioridad {
  return Number.isInteger(prioridad) && prioridad >= 1 && prioridad <= 3;
}

export function validarTarea(entrada: EntradaValidable, ahora: Date = new Date()): ErroresTarea {
  const errores: ErroresTarea = {};
  const titulo = entrada.titulo.trim();

  if (titulo.length < TITULO_MINIMO || titulo.length > TITULO_MAXIMO) {
    errores.titulo = "El título debe tener entre 3 y 100 caracteres.";
  }

  if (!esPrioridadValida(entrada.prioridad)) {
    errores.prioridad = "La prioridad debe ser 1, 2 o 3.";
  }

  if (entrada.vence_en !== null) {
    const fecha = aFecha(entrada.vence_en);
    if (fecha === null) {
      errores.vence_en = "La fecha de vencimiento no es válida.";
    } else if (fecha.getTime() < inicioDelDia(ahora).getTime()) {
      errores.vence_en = "La fecha de vencimiento no puede ser anterior a hoy.";
    }
  }

  return errores;
}

/** Regla puramente temporal: la UI decide combinarla con `!completada`. */
export function estaVencida(tarea: Tarea, ahora: Date = new Date()): boolean {
  if (tarea.vence_en === null) {
    return false;
  }
  const fecha = aFecha(tarea.vence_en);
  return fecha !== null && fecha.getTime() < inicioDelDia(ahora).getTime();
}

export function ordenarTareas(tareas: readonly Tarea[], ahora: Date = new Date()): Tarea[] {
  return [...tareas].sort((a, b) => compararTareas(a, b, ahora));
}

function compararTareas(a: Tarea, b: Tarea, ahora: Date): number {
  const grupoA = estaVencida(a, ahora) ? 0 : 1;
  const grupoB = estaVencida(b, ahora) ? 0 : 1;
  if (grupoA !== grupoB) {
    return grupoA - grupoB;
  }
  if (a.prioridad !== b.prioridad) {
    return a.prioridad - b.prioridad;
  }
  const fechaA = valorFecha(a.vence_en);
  const fechaB = valorFecha(b.vence_en);
  if (fechaA !== fechaB) {
    return fechaA - fechaB;
  }
  return a.id - b.id;
}

/**
 * Las fechas inválidas no son comparables: van después de las válidas y
 * antes de `null`; `null` queda siempre al final.
 */
function valorFecha(venceEn: string | null): number {
  if (venceEn === null) {
    return Number.POSITIVE_INFINITY;
  }
  const fecha = aFecha(venceEn);
  return fecha === null ? Number.MAX_VALUE : fecha.getTime();
}
