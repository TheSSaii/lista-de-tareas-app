import { migraciones as MIGRACIONES, type Migracion } from "./esquema";
import type { BaseDeDatos } from "./tipos";

type FilaVersion = {
  user_version: number;
};

function versionActual(fila: FilaVersion | null): number {
  return fila?.user_version ?? 0;
}

/**
 * PRAGMA no acepta parámetros enlazados. El valor solo proviene de la lista
 * interna de migraciones y se valida como entero no negativo.
 */
function sentenciaUserVersion(version: number): string {
  if (!Number.isInteger(version) || version < 0) {
    throw new Error(`versión de migración inválida: ${version}`);
  }
  return `PRAGMA user_version = ${version}`;
}

async function aplicarPendientes(db: BaseDeDatos, pendientes: readonly Migracion[]): Promise<void> {
  await db.execAsync("BEGIN");
  try {
    for (const migracion of pendientes) {
      await db.execAsync(migracion.sql);
      await db.execAsync(sentenciaUserVersion(migracion.version));
    }
    await db.execAsync("COMMIT");
  } catch (error) {
    await db.execAsync("ROLLBACK");
    throw error;
  }
}

export async function migrar(
  db: BaseDeDatos,
  migraciones: readonly Migracion[] = MIGRACIONES,
): Promise<void> {
  const fila = await db.getFirstAsync<FilaVersion>("PRAGMA user_version", []);
  const actual = versionActual(fila);
  const pendientes = [...migraciones]
    .filter((migracion) => migracion.version > actual)
    .sort((a, b) => a.version - b.version);

  if (pendientes.length === 0) {
    return;
  }

  await aplicarPendientes(db, pendientes);
}
