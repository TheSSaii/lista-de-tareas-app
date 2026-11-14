import type { BaseDeDatos, ParametroSQL } from "../db/tipos";
import type { FilaTarea } from "../repositories/tarea.repositorio";

export type Consulta = { sql: string; parametros: ParametroSQL[] };

export type Registro = {
  ejecuciones: Consulta[];
  lecturas: Consulta[];
  primeras: Consulta[];
};

export type OpcionesBase = {
  filas?: FilaTarea[];
  fila?: FilaTarea | null;
  lastInsertRowId?: number;
  changes?: number;
};

/** Doble en memoria de `BaseDeDatos`: no abre SQLite ni toca el dispositivo. */
export function crearBaseFalsa(opciones: OpcionesBase = {}): {
  db: BaseDeDatos;
  registro: Registro;
} {
  const registro: Registro = { ejecuciones: [], lecturas: [], primeras: [] };

  const db: BaseDeDatos = {
    async execAsync() {},
    async runAsync(sql, parametros) {
      registro.ejecuciones.push({ sql, parametros });
      return {
        lastInsertRowId: opciones.lastInsertRowId ?? 1,
        changes: opciones.changes ?? 1,
      };
    },
    async getAllAsync<T>(sql: string, parametros: ParametroSQL[]) {
      registro.lecturas.push({ sql, parametros });
      return (opciones.filas ?? []) as unknown as T[];
    },
    async getFirstAsync<T>(sql: string, parametros: ParametroSQL[]) {
      registro.primeras.push({ sql, parametros });
      return (opciones.fila ?? null) as unknown as T | null;
    },
  };

  return { db, registro };
}

export function fila(cambios: Partial<FilaTarea> = {}): FilaTarea {
  return {
    id: 1,
    titulo: "Comprar pan",
    descripcion: null,
    prioridad: 2,
    vence_en: null,
    completada: 0,
    notificacion_id: null,
    ...cambios,
  };
}
