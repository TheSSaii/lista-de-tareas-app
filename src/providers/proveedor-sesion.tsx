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

import { crearAuthApi } from "../api/auth.api";
import { crearSolicitar, type Solicitar } from "../api/cliente";
import { leerConfigApi, type ConfigApi } from "../api/config";
import { ErrorSesionExpirada } from "../api/errores";
import { borrarSesion, guardarSesion, leerSesion } from "../api/sesion.almacen";
import { crearApiTareas } from "../api/tareas.api";
import { obtenerBaseDeDatos } from "../db/base-sesion";
import {
  cerrarCuenta,
  descartarDatosLocales,
  hayDatosLocales,
  prepararCuenta,
} from "../services/cuenta.servicio";
import type { EstadoSesion } from "../services/navegacion.sesion";
import { crearServicioSesion, type ServicioSesion } from "../services/sesion.servicio";
import type { Usuario } from "../services/tipos-sesion";
import type { ApiTareas } from "../services/tipos-sincronizacion";

type ContextoSesion = {
  estado: EstadoSesion;
  usuario: Usuario | null;
  apiTareas: ApiTareas | null;
  errorConfig: string | null;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  registrarse: (email: string, password: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  hayTareasLocales: () => Promise<boolean>;
  descartarTareasLocales: () => Promise<void>;
};

type Estado = Dispatch<SetStateAction<EstadoSesion>>;
type EstadoUsuario = Dispatch<SetStateAction<Usuario | null>>;

const Contexto = createContext<ContextoSesion | null>(null);
const ALMACEN = { leer: leerSesion, guardar: guardarSesion, borrar: borrarSesion };
const MENSAJE_CONFIG = "Falta configurar EXPO_PUBLIC_API_URL.";

function useRecursos(config: ConfigApi | null, setEstado: Estado, setUsuario: EstadoUsuario) {
  const [servicio] = useState<ServicioSesion>(() =>
    crearServicioSesion({
      auth: config === null ? null : crearAuthApi({ baseUrl: config.baseUrl }),
      almacen: ALMACEN,
    }),
  );

  const expirar = useCallback(() => {
    void servicio.cerrar();
    setUsuario(null);
    setEstado("invitado");
  }, [servicio, setEstado, setUsuario]);

  const [solicitar] = useState<Solicitar | null>(() => {
    if (config === null) return null;
    return crearSolicitar({
      baseUrl: config.baseUrl,
      sesion: {
        obtenerToken: () => servicio.obtenerToken(),
        renovar: () => servicio.renovar(),
        alExpirar: expirar,
      },
    });
  });

  const [apiTareas] = useState<ApiTareas | null>(() =>
    solicitar === null ? null : crearApiTareas(solicitar),
  );

  return { servicio, solicitar, apiTareas };
}

function useCargaInicialSesion(
  servicio: ServicioSesion,
  solicitar: Solicitar | null,
  setEstado: Estado,
  setUsuario: EstadoUsuario,
): void {
  useEffect(() => {
    let activo = true;

    void (async () => {
      // Sin URL de API no hay forma de autenticar: se muestra login con el
      // aviso de configuración, aunque hubiera una sesión guardada.
      if (solicitar === null) {
        if (activo) setEstado("invitado");
        return;
      }

      const guardada = await servicio.cargar().catch(() => null);
      if (!activo) return;
      if (guardada === null) {
        setEstado("invitado");
        return;
      }

      setUsuario(guardada.usuario);
      setEstado("autenticado");

      try {
        const datos = await solicitar<{ usuario: Usuario }>("/api/auth/yo");
        await servicio.actualizarUsuario(datos.usuario);
        if (activo) setUsuario(datos.usuario);
      } catch (error) {
        if (error instanceof ErrorSesionExpirada) {
          setUsuario(null);
          setEstado("invitado");
        }
      }
    })();

    return () => {
      activo = false;
    };
  }, [servicio, solicitar, setEstado, setUsuario]);
}

async function prepararBase(usuarioId: string): Promise<void> {
  try {
    const db = await obtenerBaseDeDatos();
    await prepararCuenta(db, usuarioId);
  } catch {
    // En web no hay SQLite; la sesión sigue siendo válida.
  }
}

function useEntrada(servicio: ServicioSesion, setEstado: Estado, setUsuario: EstadoUsuario) {
  const iniciarSesion = useCallback(
    async (email: string, password: string) => {
      const sesion = await servicio.iniciar(email, password);
      await prepararBase(sesion.usuario.id);
      setUsuario(sesion.usuario);
      setEstado("autenticado");
    },
    [servicio, setEstado, setUsuario],
  );

  const registrarse = useCallback(
    async (email: string, password: string) => {
      const sesion = await servicio.registrar(email, password);
      await prepararBase(sesion.usuario.id);
      setUsuario(sesion.usuario);
      setEstado("autenticado");
    },
    [servicio, setEstado, setUsuario],
  );

  return { iniciarSesion, registrarse };
}

function useSalida(servicio: ServicioSesion, setEstado: Estado, setUsuario: EstadoUsuario) {
  return useCallback(async () => {
    await servicio.cerrar();
    try {
      const db = await obtenerBaseDeDatos();
      await cerrarCuenta(db);
    } catch {
      // Sin SQLite (web) no hay datos locales que purgar.
    }
    setUsuario(null);
    setEstado("invitado");
  }, [servicio, setEstado, setUsuario]);
}

function useDatosLocales() {
  const hayTareasLocales = useCallback(async () => {
    try {
      return await hayDatosLocales(await obtenerBaseDeDatos());
    } catch {
      return false;
    }
  }, []);

  const descartarTareasLocales = useCallback(async () => {
    try {
      await descartarDatosLocales(await obtenerBaseDeDatos());
    } catch {
      // Sin SQLite no hay nada que borrar.
    }
  }, []);

  return { hayTareasLocales, descartarTareasLocales };
}

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [config] = useState<ConfigApi | null>(() => leerConfigApi());
  const [estado, setEstado] = useState<EstadoSesion>("cargando");
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const { servicio, solicitar, apiTareas } = useRecursos(config, setEstado, setUsuario);

  useCargaInicialSesion(servicio, solicitar, setEstado, setUsuario);
  const entrada = useEntrada(servicio, setEstado, setUsuario);
  const cerrarSesion = useSalida(servicio, setEstado, setUsuario);
  const datos = useDatosLocales();

  const valor = useMemo<ContextoSesion>(
    () => ({
      estado,
      usuario,
      apiTareas,
      errorConfig: config === null ? MENSAJE_CONFIG : null,
      ...entrada,
      cerrarSesion,
      ...datos,
    }),
    [estado, usuario, apiTareas, config, entrada, cerrarSesion, datos],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ContextoSesion {
  const contexto = useContext(Contexto);
  if (contexto === null) {
    throw new Error("useSesion debe usarse dentro de ProveedorSesion.");
  }
  return contexto;
}
