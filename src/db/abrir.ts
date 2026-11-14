import { openDatabaseAsync } from "expo-sqlite";

import { migrar } from "./migraciones";
import type { BaseDeDatos } from "./tipos";

type AbrirBase = (nombre: string) => Promise<BaseDeDatos>;

export async function abrirBaseDeDatos(abrir: AbrirBase = openDatabaseAsync): Promise<BaseDeDatos> {
  const db = await abrir("tareas.db");

  await db.execAsync("PRAGMA journal_mode = WAL");
  await db.execAsync("PRAGMA foreign_keys = ON");
  await migrar(db);

  return db;
}
