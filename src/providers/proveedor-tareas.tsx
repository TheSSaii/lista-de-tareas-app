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
import type { EstadoSincronizacion } from "../services/tipos-sincronizacion";
import { useAccionesTareas, type AccionesTareas } from "./use-acciones-tareas";
import { useSesion } from "./proveedor-sesion";
import { useSincronizacion } from "./use-sincronizacion";

type ContextoTareas = AccionesTareas & {
  tareas: Tarea[];
  cargando: boolean;
  error: string | null;
  aviso: string | null;
  puedeDeshacer: boolean;
  recargar: () => void;
  descartarAviso: () => void;
  estadoSync: EstadoSincronizacion;
  pendientesSync: number;
  ultimaSync: string | null;
  sincronizar: () => Promise<void>;
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
  activo: boolean,
  setTareas: EstadoTareas,
  setCargando: EstadoBooleano,
  setError: EstadoError,
): void {
  useEffect(() => {
    if (!activo) {
      setTareas([]);
      setCargando(false);
      setError(null);
      return;
    }

    let vivo = true;
    setCargando(true);

    void leerTareas()
      .then((lista) => {
        if (!vivo) return;
        setTareas(lista);
        setCargando(false);
      })
      .catch(() => {
        if (!vivo) return;
        setError(MENSAJE_CARGA);
        setCargando(false);
      });

    return () => {
      vivo = false;
    };
  }, [activo, setTareas, setCargando, setError]);
}

function useRecargar(
  activo: boolean,
  setTareas: EstadoTareas,
  setCargando: EstadoBooleano,
  setError: EstadoError,
): () => void {
  return useCallback(() => {
    if (!activo) return;
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
  }, [activo, setTareas, setCargando, setError]);
}

type ParametrosValor = {
  acciones: AccionesTareas;
  tareas: Tarea[];
  cargando: boolean;
  error: string | null;
  aviso: string | null;
  historial: HistorialDeshacer;
  recargar: () => void;
  descartarAviso: () => void;
  activo: boolean;
  sincronizacion: ReturnType<typeof useSincronizacion>;
};

function useValorTareas(parametros: ParametrosValor): ContextoTareas {
  const { acciones, tareas, cargando, error, aviso, historial, recargar, descartarAviso } =
    parametros;
  const sincronizacion = parametros.sincronizacion;

  return useMemo(
    () => ({
      ...acciones,
      tareas,
      cargando,
      error,
      aviso,
      puedeDeshacer: puedeDeshacer(historial),
      recargar,
      descartarAviso,
      estadoSync: parametros.activo ? sincronizacion.estadoSync : "inactivo",
      pendientesSync: sincronizacion.pendientesSync,
      ultimaSync: sincronizacion.ultimaSync,
      sincronizar: sincronizacion.sincronizar,
    }),
    [
      acciones,
      tareas,
      cargando,
      error,
      aviso,
      historial,
      recargar,
      descartarAviso,
      parametros.activo,
      sincronizacion,
    ],
  );
}

export function ProveedorTareas({ children }: { children: ReactNode }) {
  const { estado: estadoSesion, apiTareas } = useSesion();
  const activo = estadoSesion === "autenticado";
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [historial, setHistorial] = useState<HistorialDeshacer>(HISTORIAL_VACIO);

  useCargaInicial(activo, setTareas, setCargando, setError);
  const recargar = useRecargar(activo, setTareas, setCargando, setError);
  const sincronizacion = useSincronizacion({ activo, apiTareas, setTareas, setAviso });
  const acciones = useAccionesTareas({
    tareas,
    setTareas,
    setError,
    setAviso,
    historial,
    setHistorial,
    alCambiar: () => {
      void sincronizacion.sincronizar();
    },
  });
  const descartarAviso = useCallback(() => {
    setAviso(null);
  }, []);

  useEffect(() => {
    configurarNotificaciones();
  }, []);

  const valor = useValorTareas({
    acciones,
    tareas,
    cargando,
    error,
    aviso,
    historial,
    recargar,
    descartarAviso,
    activo,
    sincronizacion,
  });

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTareas(): ContextoTareas {
  const contexto = useContext(Contexto);
  if (contexto === null) {
    throw new Error("useTareas debe usarse dentro de ProveedorTareas.");
  }

  return contexto;
}
