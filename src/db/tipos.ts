export type ParametroSQL = string | number | null;

export type ResultadoEjecucion = {
  lastInsertRowId: number;
  changes: number;
};

/**
 * Superficie mínima de expo-sqlite que usan las migraciones y el repositorio.
 * Permite inyectar un doble en las pruebas sin depender de un dispositivo.
 */
export type BaseDeDatos = {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, parametros: ParametroSQL[]): Promise<ResultadoEjecucion>;
  getAllAsync<T>(sql: string, parametros: ParametroSQL[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, parametros: ParametroSQL[]): Promise<T | null>;
};
