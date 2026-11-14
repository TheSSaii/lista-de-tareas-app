import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import { obtenerBaseDeDatos } from "../db/base-sesion";
import { ordenarTareas } from "../services/tarea";
import type { Tarea } from "../services/tarea";
import {
  actualizarTarea,
  alternarCompletada,
  crearTarea,
  eliminarTarea,
  listarTareas,
} from "../services/tareas.servicio";
import type { EntradaTarea, ResultadoGuardado } from "../services/tareas.servicio";

type ContextoTareas = {
  tareas: Tarea[];
  cargando: boolean;
  error: string | null;
  alternar: (tarea: Tarea) => void;
  recargar: () => void;
  crear: (entrada: EntradaTarea) => Promise<ResultadoGuardado>;
  actualizar: (id: number, entrada: EntradaTarea) => Promise<ResultadoGuardado>;
  eliminar: (id: number) => Promise<boolean>;
};

type EstadoTareas = Dispatch<SetStateAction<Tarea[]>>;
type EstadoBooleano = Dispatch<SetStateAction<boolean>>;
type EstadoError = Dispatch<SetStateAction<string | null>>;

const MENSAJE_CARGA = "No se pudieron cargar las tareas.";
const MENSAJE_ALTERAR = "No se pudo actualizar la tarea.";
const MENSAJE_CREAR = "No se pudo crear la tarea.";
const MENSAJE_ACTUALIZAR = "No se pudo actualizar la tarea.";

const Contexto = createContext<ContextoTareas | null>(null);

async function leerTareas(): Promise<Tarea[]> {
  const db = await obtenerBaseDeDatos();
  return listarTareas(db);
}

function useCargaInicial(
  setTareas: EstadoTareas,
  setCargando: EstadoBooleano,
  setError: EstadoError,
): void {
  useEffect(() => {
    let activo = true;

    void leerTareas()
      .then((lista) => {
        if (!activo) return;
        setTareas(lista);
        setCargando(false);
      })
      .catch(() => {
        if (!activo) return;
        setError(MENSAJE_CARGA);
        setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [setTareas, setCargando, setError]);
}

function useRecargar(
  setTareas: EstadoTareas,
  setCargando: EstadoBooleano,
  setError: EstadoError,
): () => void {
  return useCallback(() => {
    setCargando(true);
    setError(null);

    void leerTareas()
      .then((lista) => {
        setTareas(lista);
        setCargando(false);
      })
      .catch(() => {
        setError(MENSAJE_CARGA);
        setCargando(false);
      });
  }, [setTareas, setCargando, setError]);
}

function useAlternar(setTareas: EstadoTareas, setError: EstadoError): (tarea: Tarea) => void {
  return useCallback(
    (tarea: Tarea) => {
      setError(null);

      void (async () => {
        try {
          const db = await obtenerBaseDeDatos();
          const actualizada = await alternarCompletada(db, tarea);
          setTareas((previas) =>
            previas.map((item) => (item.id === actualizada.id ? actualizada : item)),
          );
        } catch {
          setError(MENSAJE_ALTERAR);
        }
      })();
    },
    [setTareas, setError],
  );
}

function useCrear(setTareas: EstadoTareas): (entrada: EntradaTarea) => Promise<ResultadoGuardado> {
  return useCallback(
    async (entrada: EntradaTarea): Promise<ResultadoGuardado> => {
      try {
        const db = await obtenerBaseDeDatos();
        const resultado = await crearTarea(db, entrada);
        if (resultado.ok) {
          setTareas((previas) => ordenarTareas([...previas, resultado.tarea]));
        }
        return resultado;
      } catch {
        return { ok: false, errores: {}, error: MENSAJE_CREAR };
      }
    },
    [setTareas],
  );
}

function useActualizar(
  setTareas: EstadoTareas,
): (id: number, entrada: EntradaTarea) => Promise<ResultadoGuardado> {
  return useCallback(
    async (id: number, entrada: EntradaTarea): Promise<ResultadoGuardado> => {
      try {
        const db = await obtenerBaseDeDatos();
        const resultado = await actualizarTarea(db, id, entrada);
        if (resultado.ok) {
          setTareas((previas) =>
            ordenarTareas(
              previas.map((tarea) => (tarea.id === resultado.tarea.id ? resultado.tarea : tarea)),
            ),
          );
        }
        return resultado;
      } catch {
        return { ok: false, errores: {}, error: MENSAJE_ACTUALIZAR };
      }
    },
    [setTareas],
  );
}

function useEliminar(setTareas: EstadoTareas): (id: number) => Promise<boolean> {
  return useCallback(
    async (id: number): Promise<boolean> => {
      try {
        const db = await obtenerBaseDeDatos();
        const eliminada = await eliminarTarea(db, id);
        if (eliminada) {
          setTareas((previas) => previas.filter((tarea) => tarea.id !== id));
        }
        return eliminada;
      } catch {
        return false;
      }
    },
    [setTareas],
  );
}

export function ProveedorTareas({ children }: { children: ReactNode }) {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useCargaInicial(setTareas, setCargando, setError);
  const recargar = useRecargar(setTareas, setCargando, setError);
  const alternar = useAlternar(setTareas, setError);
  const crear = useCrear(setTareas);
  const actualizar = useActualizar(setTareas);
  const eliminar = useEliminar(setTareas);

  const valor = useMemo<ContextoTareas>(
    () => ({ tareas, cargando, error, alternar, recargar, crear, actualizar, eliminar }),
    [tareas, cargando, error, alternar, recargar, crear, actualizar, eliminar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTareas(): ContextoTareas {
  const contexto = useContext(Contexto);
  if (contexto === null) {
    throw new Error("useTareas debe usarse dentro de ProveedorTareas.");
  }

  return contexto;
}
