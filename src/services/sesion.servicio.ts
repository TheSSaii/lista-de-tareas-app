import type { AuthApi, SesionConUsuario } from "../api/auth.api";
import { ErrorApi, ErrorConfig, ErrorSesionExpirada } from "../api/errores";
import type { SesionGuardada, SesionRemota, Usuario } from "./tipos-sesion";

export type AlmacenSesion = {
  leer: () => Promise<SesionGuardada | null>;
  guardar: (sesion: SesionGuardada) => Promise<void>;
  borrar: () => Promise<void>;
};

export type ServicioSesion = {
  cargar: () => Promise<SesionGuardada | null>;
  iniciar: (email: string, password: string) => Promise<SesionGuardada>;
  registrar: (email: string, password: string) => Promise<SesionGuardada>;
  renovar: () => Promise<string>;
  cerrar: () => Promise<void>;
  obtenerToken: () => string | null;
  obtenerSesion: () => SesionGuardada | null;
  actualizarUsuario: (usuario: Usuario) => Promise<void>;
};

export type OpcionesServicioSesion = {
  auth: AuthApi | null;
  almacen: AlmacenSesion;
  ahora?: () => number;
};

function esErrorDeCredenciales(error: unknown): boolean {
  return error instanceof ErrorApi && (error.estado === 401 || error.estado === 400);
}

class ServicioSesionConAlmacen implements ServicioSesion {
  private actual: SesionGuardada | null = null;
  private renovacion: Promise<string> | null = null;
  private readonly ahora: () => number;

  constructor(private readonly opciones: OpcionesServicioSesion) {
    this.ahora = opciones.ahora ?? Date.now;
  }

  private exigirAuth(): AuthApi {
    if (this.opciones.auth === null) {
      throw new ErrorConfig("Falta configurar EXPO_PUBLIC_API_URL.");
    }
    return this.opciones.auth;
  }

  private desdeRemota(remota: SesionRemota, usuario: Usuario): SesionGuardada {
    return { ...remota, usuario, expiraEn: this.ahora() + remota.expiraEnSeg * 1000 };
  }

  private async guardar(sesion: SesionGuardada): Promise<SesionGuardada> {
    this.actual = sesion;
    await this.opciones.almacen.guardar(sesion);
    return sesion;
  }

  private async entrar(
    operacion: (auth: AuthApi) => Promise<SesionConUsuario>,
  ): Promise<SesionGuardada> {
    const remota = await operacion(this.exigirAuth());
    return this.guardar(this.desdeRemota(remota, remota.usuario));
  }

  private async ejecutarRenovacion(): Promise<string> {
    if (this.actual === null) throw new ErrorSesionExpirada();
    const anterior = this.actual;

    try {
      const remota = await this.exigirAuth().refresh(anterior.refreshToken);
      // Si el usuario cerró sesión o entró con otra cuenta mientras el refresh
      // estaba en vuelo, no se debe volver a escribir la sesión anterior.
      if (this.actual === null || this.actual.token !== anterior.token) {
        throw new ErrorSesionExpirada();
      }
      const sesion = this.desdeRemota(remota, anterior.usuario);
      await this.guardar(sesion);
      return sesion.token;
    } catch (error) {
      if (esErrorDeCredenciales(error)) {
        this.actual = null;
        await this.opciones.almacen.borrar();
        throw new ErrorSesionExpirada();
      }
      throw error;
    }
  }

  async cargar(): Promise<SesionGuardada | null> {
    this.actual = await this.opciones.almacen.leer();
    return this.actual;
  }

  iniciar(email: string, password: string): Promise<SesionGuardada> {
    return this.entrar((auth) => auth.login(email, password));
  }

  registrar(email: string, password: string): Promise<SesionGuardada> {
    return this.entrar((auth) => auth.registro(email, password));
  }

  renovar(): Promise<string> {
    if (this.renovacion === null) {
      this.renovacion = this.ejecutarRenovacion().finally(() => {
        this.renovacion = null;
      });
    }
    return this.renovacion;
  }

  async cerrar(): Promise<void> {
    this.actual = null;
    await this.opciones.almacen.borrar();
  }

  obtenerToken(): string | null {
    return this.actual?.token ?? null;
  }

  obtenerSesion(): SesionGuardada | null {
    return this.actual;
  }

  async actualizarUsuario(usuario: Usuario): Promise<void> {
    if (this.actual === null) return;
    await this.guardar({ ...this.actual, usuario });
  }
}

export function crearServicioSesion(opciones: OpcionesServicioSesion): ServicioSesion {
  return new ServicioSesionConAlmacen(opciones);
}
