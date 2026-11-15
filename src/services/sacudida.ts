export type MedicionAceleracion = {
  x: number;
  y: number;
  z: number;
  timestamp: number;
};

export const UMBRAL_SACUDIDA = 2.2;
export const ENFRIAMIENTO_MS = 1000;

export function magnitud(medicion: MedicionAceleracion): number {
  return Math.sqrt(medicion.x ** 2 + medicion.y ** 2 + medicion.z ** 2);
}

export function esSacudida(
  medicion: MedicionAceleracion,
  ultimaSacudidaMs: number | null,
  ahoraMs: number,
): boolean {
  if (ultimaSacudidaMs !== null && ahoraMs - ultimaSacudidaMs < ENFRIAMIENTO_MS) {
    return false;
  }

  return magnitud(medicion) > UMBRAL_SACUDIDA;
}
