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
import { HISTORIAL_VACIO, puedeDeshacer, type HistorialDeshacer } from "../services/deshacer";
import { configurarNotificaciones } from "../services/notificaciones";
import type { Tarea } from "../services/tarea";
import { listarTareas } from "../services/tareas.servicio";
import { useAccionesTareas, type AccionesTareas } from "./use-acciones-tareas";

type ContextoTareas = AccionesTareas & {
  tareas: Tarea[];
  cargando: boolean;
  error: string | null;
  aviso: string | null;
  puedeDeshacer: boolean;
  recargar: () => void;
  descartarAviso: () => void;
};

type EstadoTareas = Dispatch<SetStateAction<Tarea[]>>;
type EstadoBooleano = Dispatch<SetStateAction<boolean>>;
type EstadoError = Dispatch<SetStateAction<string | null>>;

const MENSAJE_CARGA = "No se pudieron cargar las tareas.";

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

export function ProveedorTareas({ children }: { children: ReactNode }) {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [historial, setHistorial] = useState<HistorialDeshacer>(HISTORIAL_VACIO);

  useCargaInicial(setTareas, setCargando, setError);
  const recargar = useRecargar(setTareas, setCargando, setError);
  const acciones = useAccionesTareas({
    tareas,
    setTareas,
    setError,
    setAviso,
    historial,
    setHistorial,
  });
  const descartarAviso = useCallback(() => {
    setAviso(null);
  }, []);

  useEffect(() => {
    configurarNotificaciones();
  }, []);

  const valor = useMemo<ContextoTareas>(
    () => ({
      ...acciones,
      tareas,
      cargando,
      error,
      aviso,
      puedeDeshacer: puedeDeshacer(historial),
      recargar,
      descartarAviso,
    }),
    [acciones, tareas, cargando, error, aviso, historial, recargar, descartarAviso],
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
