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
  {
    version: 2,
    sql: `ALTER TABLE tarea ADD COLUMN remote_id TEXT;
ALTER TABLE tarea ADD COLUMN updated_at TEXT;
ALTER TABLE tarea ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tarea ADD COLUMN pending INTEGER NOT NULL DEFAULT 0;
UPDATE tarea SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE updated_at IS NULL;
UPDATE tarea SET pending = 1;
CREATE UNIQUE INDEX idx_tarea_remote_id ON tarea(remote_id) WHERE remote_id IS NOT NULL;
CREATE INDEX idx_tarea_pendiente ON tarea(pending);
CREATE TABLE sincronizacion (
  clave TEXT PRIMARY KEY NOT NULL,
  valor TEXT NOT NULL
);`,
  },
];
