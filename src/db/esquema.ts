export type Migracion = {
  version: number;
  sql: string;
};

/** Sección 8 de docs/03-lista-de-tareas.md. */
export const migraciones: readonly Migracion[] = [
  {
    version: 1,
    sql: `CREATE TABLE tarea (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  prioridad INTEGER NOT NULL DEFAULT 2 CHECK (prioridad BETWEEN 1 AND 3),
  vence_en TEXT,
  completada INTEGER NOT NULL DEFAULT 0 CHECK (completada IN (0,1)),
  notificacion_id TEXT
);`,
  },
];
