import type { SesionGuardada } from "../services/tipos-sesion";

/** En web no hay SecureStore: la sesión vive solo en memoria, sin persistencia. */
let sesion: SesionGuardada | null = null;

export async function guardarSesion(nueva: SesionGuardada): Promise<void> {
  sesion = nueva;
}

export async function borrarSesion(): Promise<void> {
  sesion = null;
}

export async function leerSesion(): Promise<SesionGuardada | null> {
  return sesion;
}
