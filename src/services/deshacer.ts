import type { Tarea } from "./tarea";

export type HistorialDeshacer = {
  anterior: Tarea | null;
};

export const HISTORIAL_VACIO: HistorialDeshacer = { anterior: null };

/** Profundidad 1: la última acción reemplaza a la anterior. */
export function registrarEnHistorial(
  _historial: HistorialDeshacer,
  anterior: Tarea,
): HistorialDeshacer {
  return { anterior };
}

export function puedeDeshacer(historial: HistorialDeshacer): boolean {
  return historial.anterior !== null;
}

export function deshacerHistorial(historial: HistorialDeshacer): {
  tarea: Tarea | null;
  historial: HistorialDeshacer;
} {
  return { tarea: historial.anterior, historial: HISTORIAL_VACIO };
}
