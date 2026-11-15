import { useCallback, type Dispatch, type SetStateAction } from "react";

import { obtenerBaseDeDatos } from "../db/base-sesion";
import {
  HISTORIAL_VACIO,
  deshacerHistorial,
  registrarEnHistorial,
  type HistorialDeshacer,
} from "../services/deshacer";
import { notificadorExpo } from "../services/notificaciones";
import {
  actualizarTareaConRecordatorio,
  alternarTareaConRecordatorio,
  crearTareaConRecordatorio,
  eliminarTareaConRecordatorio,
  posponerTareaConRecordatorio,
  restaurarTareaConRecordatorio,
} from "../services/recordatorios.servicio";
import { ordenarTareas } from "../services/tarea";
import type { Tarea } from "../services/tarea";
import type { EntradaTarea, ResultadoGuardado } from "../services/tareas.servicio";

const MENSAJE_ALTERAR = "No se pudo actualizar la tarea.";
const MENSAJE_CREAR = "No se pudo crear la tarea.";
const MENSAJE_ACTUALIZAR = "No se pudo actualizar la tarea.";
const MENSAJE_ELIMINAR = "No se pudo eliminar la tarea.";
const MENSAJE_DESHACER = "No se pudo deshacer la última acción.";

type EstadoTareas = Dispatch<SetStateAction<Tarea[]>>;
type EstadoTexto = Dispatch<SetStateAction<string | null>>;

export type EstadoAcciones = {
  tareas: Tarea[];
  setTareas: EstadoTareas;
  setError: EstadoTexto;
  setAviso: EstadoTexto;
  historial: HistorialDeshacer;
  setHistorial: Dispatch<SetStateAction<HistorialDeshacer>>;
};

export type AccionesTareas = {
  alternar: (tarea: Tarea) => void;
  posponer: (tarea: Tarea) => void;
  deshacer: () => void;
  crear: (entrada: EntradaTarea) => Promise<ResultadoGuardado>;
  actualizar: (id: number, entrada: EntradaTarea) => Promise<ResultadoGuardado>;
  eliminar: (id: number) => Promise<boolean>;
};

function reemplazar(tareas: Tarea[], tarea: Tarea): Tarea[] {
  return ordenarTareas(tareas.map((item) => (item.id === tarea.id ? tarea : item)));
}

function useAlternar(estado: EstadoAcciones): (tarea: Tarea) => void {
  const { setTareas, setError, setAviso, setHistorial } = estado;

  return useCallback(
    (tarea: Tarea) => {
      setError(null);

      void (async () => {
        try {
          const db = await obtenerBaseDeDatos();
          const resultado = await alternarTareaConRecordatorio(db, tarea, notificadorExpo);
          setTareas((previas) => reemplazar(previas, resultado.tarea));
          setHistorial(registrarEnHistorial(HISTORIAL_VACIO, tarea));
          if (resultado.aviso !== undefined) setAviso(resultado.aviso);
        } catch {
          setError(MENSAJE_ALTERAR);
        }
      })();
    },
    [setAviso, setError, setHistorial, setTareas],
  );
}

function usePosponer(estado: EstadoAcciones): (tarea: Tarea) => void {
  const { setTareas, setError, setAviso, setHistorial } = estado;

  return useCallback(
    (tarea: Tarea) => {
      setError(null);

      void (async () => {
        try {
          const db = await obtenerBaseDeDatos();
          const resultado = await posponerTareaConRecordatorio(db, tarea, notificadorExpo);
          if (!resultado.ok) {
            setAviso(resultado.aviso);
            return;
          }
          setTareas((previas) => reemplazar(previas, resultado.tarea));
          setHistorial(registrarEnHistorial(HISTORIAL_VACIO, tarea));
          if (resultado.aviso !== undefined) setAviso(resultado.aviso);
        } catch {
          setError(MENSAJE_ALTERAR);
        }
      })();
    },
    [setAviso, setError, setHistorial, setTareas],
  );
}

function useCrear(estado: EstadoAcciones): (entrada: EntradaTarea) => Promise<ResultadoGuardado> {
  const { setTareas, setAviso, setHistorial } = estado;

  return useCallback(
    async (entrada: EntradaTarea): Promise<ResultadoGuardado> => {
      try {
        const db = await obtenerBaseDeDatos();
        const resultado = await crearTareaConRecordatorio(db, entrada, notificadorExpo);
        if (resultado.ok) {
          setTareas((previas) => ordenarTareas([...previas, resultado.tarea]));
          setHistorial(HISTORIAL_VACIO);
          if (resultado.aviso !== undefined) setAviso(resultado.aviso);
        }
        return resultado;
      } catch {
        return { ok: false, errores: {}, error: MENSAJE_CREAR };
      }
    },
    [setAviso, setHistorial, setTareas],
  );
}

function useActualizar(
  estado: EstadoAcciones,
): (id: number, entrada: EntradaTarea) => Promise<ResultadoGuardado> {
  const { tareas, setTareas, setAviso, setHistorial } = estado;

  return useCallback(
    async (id: number, entrada: EntradaTarea): Promise<ResultadoGuardado> => {
      const anterior = tareas.find((item) => item.id === id);
      try {
        const db = await obtenerBaseDeDatos();
        const resultado = await actualizarTareaConRecordatorio(db, id, entrada, notificadorExpo);
        if (resultado.ok) {
          setTareas((previas) => reemplazar(previas, resultado.tarea));
          if (anterior !== undefined) setHistorial(registrarEnHistorial(HISTORIAL_VACIO, anterior));
          if (resultado.aviso !== undefined) setAviso(resultado.aviso);
        }
        return resultado;
      } catch {
        return { ok: false, errores: {}, error: MENSAJE_ACTUALIZAR };
      }
    },
    [setAviso, setHistorial, setTareas, tareas],
  );
}

function useEliminar(estado: EstadoAcciones): (id: number) => Promise<boolean> {
  const { setTareas, setHistorial, setError } = estado;

  return useCallback(
    async (id: number): Promise<boolean> => {
      try {
        const db = await obtenerBaseDeDatos();
        const eliminada = await eliminarTareaConRecordatorio(db, id, notificadorExpo);
        if (eliminada) {
          setTareas((previas) => previas.filter((tarea) => tarea.id !== id));
          setHistorial(HISTORIAL_VACIO);
        } else {
          setError(MENSAJE_ELIMINAR);
        }
        return eliminada;
      } catch {
        setError(MENSAJE_ELIMINAR);
        return false;
      }
    },
    [setError, setHistorial, setTareas],
  );
}

function useDeshacer(estado: EstadoAcciones): () => void {
  const { historial, setTareas, setAviso, setError, setHistorial } = estado;

  return useCallback(() => {
    const { tarea, historial: vacio } = deshacerHistorial(historial);
    setHistorial(vacio);
    if (tarea === null) {
      return;
    }

    setError(null);
    void (async () => {
      try {
        const db = await obtenerBaseDeDatos();
        const resultado = await restaurarTareaConRecordatorio(db, tarea, notificadorExpo);
        if (!resultado.ok) {
          setAviso(resultado.aviso);
          return;
        }
        setTareas((previas) => reemplazar(previas, resultado.tarea));
        if (resultado.aviso !== undefined) setAviso(resultado.aviso);
      } catch {
        setError(MENSAJE_DESHACER);
      }
    })();
  }, [historial, setAviso, setError, setHistorial, setTareas]);
}

export function useAccionesTareas(estado: EstadoAcciones): AccionesTareas {
  return {
    alternar: useAlternar(estado),
    posponer: usePosponer(estado),
    deshacer: useDeshacer(estado),
    crear: useCrear(estado),
    actualizar: useActualizar(estado),
    eliminar: useEliminar(estado),
  };
}
