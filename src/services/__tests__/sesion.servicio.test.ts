import { describe, expect, it, jest } from "@jest/globals";

import type { AuthApi } from "../../api/auth.api";
import { ErrorApi, ErrorConfig, ErrorSesionExpirada } from "../../api/errores";
import type { AlmacenSesion } from "../sesion.servicio";
import { crearServicioSesion } from "../sesion.servicio";
import type { SesionGuardada } from "../tipos-sesion";

const SESION: SesionGuardada = {
  token: "token-1",
  refreshToken: "refresh-1",
  usuario: { id: "uid-1", email: "persona@ejemplo.test" },
  expiraEn: 1_000_000,
};

function almacen(guardada: SesionGuardada | null = null): AlmacenSesion & {
  guardadas: SesionGuardada[];
  borrado: number;
} {
  let actual = guardada;
  const resultado = {
    guardadas: [] as SesionGuardada[],
    borrado: 0,
    async leer() {
      return actual;
    },
    async guardar(sesion: SesionGuardada) {
      actual = sesion;
      resultado.guardadas.push(sesion);
    },
    async borrar() {
      actual = null;
      resultado.borrado += 1;
    },
  };
  return resultado;
}

function auth(cambios: Partial<AuthApi> = {}): AuthApi {
  return {
    registro: jest.fn(async () => ({
      token: "token-1",
      refreshToken: "refresh-1",
      expiraEnSeg: 3600,
      usuario: SESION.usuario,
    })),
    login: jest.fn(async () => ({
      token: "token-1",
      refreshToken: "refresh-1",
      expiraEnSeg: 3600,
      usuario: SESION.usuario,
    })),
    refresh: jest.fn(async () => ({
      token: "token-2",
      refreshToken: "refresh-2",
      expiraEnSeg: 3600,
    })),
    yo: jest.fn(async () => SESION.usuario),
    ...cambios,
  };
}

describe("crearServicioSesion", () => {
  it("login guarda token, refresh y expiración absoluta", async () => {
    const guardado = almacen();
    const servicio = crearServicioSesion({
      auth: auth(),
      almacen: guardado,
      ahora: () => 1_000,
    });

    const sesion = await servicio.iniciar("persona@ejemplo.test", "contrasena-larga");

    expect(sesion.token).toBe("token-1");
    expect(guardado.guardadas[0]?.expiraEn).toBe(1_000 + 3_600_000);
    expect(servicio.obtenerToken()).toBe("token-1");
  });

  it("cargar restaura la sesión y renovar comparte una sola promesa", async () => {
    const guardado = almacen(SESION);
    let resolver: (valor: Awaited<ReturnType<AuthApi["refresh"]>>) => void = () => undefined;
    const promesa = new Promise<Awaited<ReturnType<AuthApi["refresh"]>>>((resolverPromesa) => {
      resolver = resolverPromesa;
    });
    const api = auth({ refresh: jest.fn(() => promesa) });
    const servicio = crearServicioSesion({ auth: api, almacen: guardado });

    await servicio.cargar();
    const primera = servicio.renovar();
    const segunda = servicio.renovar();
    resolver({ token: "token-2", refreshToken: "refresh-2", expiraEnSeg: 3600 });

    await expect(primera).resolves.toBe("token-2");
    await expect(segunda).resolves.toBe("token-2");
    expect(api.refresh).toHaveBeenCalledTimes(1);
    expect(guardado.guardadas[0]?.refreshToken).toBe("refresh-2");
  });
});

describe("crearServicioSesion: expiración y cierre", () => {
  it("un refresh rechazado borra la sesión y lanza ErrorSesionExpirada", async () => {
    const guardado = almacen(SESION);
    const api = auth({
      refresh: jest.fn(async () => {
        throw new ErrorApi(401, "Refresh inválido.");
      }),
    });
    const servicio = crearServicioSesion({ auth: api, almacen: guardado });
    await servicio.cargar();

    await expect(servicio.renovar()).rejects.toBeInstanceOf(ErrorSesionExpirada);
    expect(guardado.borrado).toBe(1);
    expect(servicio.obtenerToken()).toBeNull();
  });

  it("un error de red al renovar conserva la sesión", async () => {
    const guardado = almacen(SESION);
    const api = auth({
      refresh: jest.fn(async () => {
        throw new ErrorApi(500, "Error interno.");
      }),
    });
    const servicio = crearServicioSesion({ auth: api, almacen: guardado });
    await servicio.cargar();

    await expect(servicio.renovar()).rejects.toBeInstanceOf(ErrorApi);
    expect(guardado.borrado).toBe(0);
    expect(servicio.obtenerToken()).toBe("token-1");
  });

  it("cerrar borra la sesión y sin configuración no permite entrar", async () => {
    const guardado = almacen(SESION);
    const servicio = crearServicioSesion({ auth: null, almacen: guardado });
    await servicio.cargar();

    await servicio.cerrar();
    expect(guardado.borrado).toBe(1);
    expect(servicio.obtenerToken()).toBeNull();
    await expect(
      servicio.iniciar("persona@ejemplo.test", "contrasena-larga"),
    ).rejects.toBeInstanceOf(ErrorConfig);
  });
});
