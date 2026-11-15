import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { ErrorRed, ErrorSesionExpirada, ErrorTiempo } from "../api/errores";
import { obtenerBaseDeDatos } from "../db/base-sesion";
import { notificadorExpo } from "../services/notificaciones";
import { sincronizar as sincronizarTareas } from "../services/sincronizacion";
import { listarTareas } from "../services/tareas.servicio";
import type { Tarea } from "../services/tarea";
import type { ApiTareas, EstadoSincronizacion } from "../services/tipos-sincronizacion";

type Opciones = {
  activo: boolean;
  apiTareas: ApiTareas | null;
  setTareas: Dispatch<SetStateAction<Tarea[]>>;
  setAviso: Dispatch<SetStateAction<string | null>>;
};

type Dependencias = Opciones & {
  setEstado: Dispatch<SetStateAction<EstadoSincronizacion>>;
  setPendientes: Dispatch<SetStateAction<number>>;
  setUltimaSync: Dispatch<SetStateAction<string | null>>;
};

export type ControlSincronizacion = {
  estadoSync: EstadoSincronizacion;
  pendientesSync: number;
  ultimaSync: string | null;
  sincronizar: () => Promise<void>;
};

function estadoDeError(error: unknown): EstadoSincronizacion {
  if (error instanceof ErrorSesionExpirada) return "inactivo";
  if (error instanceof ErrorRed || error instanceof ErrorTiempo) return "sin-conexion";
  return "error";
}

async function ejecutarSincronizacion(deps: Dependencias): Promise<void> {
  if (!deps.activo) return;
  if (deps.apiTareas === null) {
    deps.setEstado("error");
    return;
  }

  deps.setEstado("sincronizando");
  try {
    const db = await obtenerBaseDeDatos();
    const resultado = await sincronizarTareas({
      db,
      api: deps.apiTareas,
      notificador: notificadorExpo,
    });
    deps.setPendientes(resultado.pendientes);
    deps.setUltimaSync(resultado.ultimaSync);
    deps.setEstado(resultado.estado);
    if (resultado.aviso !== undefined) deps.setAviso(resultado.aviso);
    deps.setTareas(await listarTareas(db));
  } catch (error) {
    deps.setEstado(estadoDeError(error));
  }
}

export function useSincronizacion(opciones: Opciones): ControlSincronizacion {
  const { activo, apiTareas, setTareas, setAviso } = opciones;
  const [estadoSync, setEstadoSync] = useState<EstadoSincronizacion>("inactivo");
  const [pendientesSync, setPendientesSync] = useState(0);
  const [ultimaSync, setUltimaSync] = useState<string | null>(null);
  const enCurso = useRef<Promise<void> | null>(null);

  const ejecutar = useCallback(
    () =>
      ejecutarSincronizacion({
        activo,
        apiTareas,
        setTareas,
        setAviso,
        setEstado: setEstadoSync,
        setPendientes: setPendientesSync,
        setUltimaSync,
      }),
    [activo, apiTareas, setTareas, setAviso],
  );

  const sincronizar = useCallback(() => {
    if (enCurso.current !== null) return enCurso.current;
    const promesa = ejecutar().finally(() => {
      enCurso.current = null;
    });
    enCurso.current = promesa;
    return promesa;
  }, [ejecutar]);

  useEffect(() => {
    if (activo) void sincronizar();
  }, [activo, sincronizar]);

  return {
    estadoSync: activo ? estadoSync : "inactivo",
    pendientesSync: activo ? pendientesSync : 0,
    ultimaSync: activo ? ultimaSync : null,
    sincronizar,
  };
}
