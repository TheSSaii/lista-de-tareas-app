import type { BaseDeDatos } from "../db/tipos";

type FilaMeta = {
  valor: string;
};

export const CLAVE_USUARIO = "usuario_id";
export const CLAVE_SINCE = "tareas_since";
export const CLAVE_ULTIMA_SYNC = "ultima_sync";

export async function leerMeta(db: BaseDeDatos, clave: string): Promise<string | null> {
  const fila = await db.getFirstAsync<FilaMeta>(
    "SELECT valor FROM sincronizacion WHERE clave = ?",
    [clave],
  );
  return fila?.valor ?? null;
}

export async function guardarMeta(db: BaseDeDatos, clave: string, valor: string): Promise<void> {
  await db.runAsync(
    "INSERT INTO sincronizacion (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor",
    [clave, valor],
  );
}

export async function borrarMeta(db: BaseDeDatos, clave: string): Promise<void> {
  await db.runAsync("DELETE FROM sincronizacion WHERE clave = ?", [clave]);
}

export async function limpiarSincronizacion(db: BaseDeDatos): Promise<void> {
  await db.runAsync("DELETE FROM sincronizacion", []);
}
