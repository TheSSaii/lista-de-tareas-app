import type { BaseDeDatos } from "./tipos";

type AbrirBase = (nombre: string) => Promise<BaseDeDatos>;

/**
 * En web no se abre SQLite: expo-sqlite web depende de `wa-sqlite` (wasm) y de las
 * cabeceras COOP/COEP, y este proyecto es móvil. La exportación web solo se usa como
 * prueba de compilación en CI, así que aquí se falla de forma explícita en vez de
 * arrastrar un binario de 1 MB al bundle.
 */
export async function abrirBaseDeDatos(abrir?: AbrirBase): Promise<BaseDeDatos> {
  void abrir;
  throw new Error("SQLite no está disponible en la versión web.");
}
