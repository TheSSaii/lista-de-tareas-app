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
import type { Tarea } from "../services/tarea";
import { alternarCompletada, listarTareas } from "../services/tareas.servicio";

type ContextoTareas = {
  tareas: Tarea[];
  cargando: boolean;
  error: string | null;
  alternar: (tarea: Tarea) => void;
  recargar: () => void;
};

type EstadoTareas = Dispatch<SetStateAction<Tarea[]>>;
type EstadoBooleano = Dispatch<SetStateAction<boolean>>;
type EstadoError = Dispatch<SetStateAction<string | null>>;

const MENSAJE_CARGA = "No se pudieron cargar las tareas.";
const MENSAJE_ALTERAR = "No se pudo actualizar la tarea.";

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

export function ProveedorTareas({ children }: { children: ReactNode }) {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useCargaInicial(setTareas, setCargando, setError);
  const recargar = useRecargar(setTareas, setCargando, setError);
  const alternar = useAlternar(setTareas, setError);

  const valor = useMemo<ContextoTareas>(
    () => ({ tareas, cargando, error, alternar, recargar }),
    [tareas, cargando, error, alternar, recargar],
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
