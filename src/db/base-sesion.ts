import { abrirBaseDeDatos } from "./abrir";
import type { BaseDeDatos } from "./tipos";

let promesaBase: Promise<BaseDeDatos> | null = null;

/**
 * Una sola apertura por sesión. Si la apertura falla, se permite reintentar.
 */
export function obtenerBaseDeDatos(): Promise<BaseDeDatos> {
  if (promesaBase === null) {
    promesaBase = abrirBaseDeDatos().catch((error: unknown) => {
      promesaBase = null;
      throw error;
    });
  }

  return promesaBase;
}
