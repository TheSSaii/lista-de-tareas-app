import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

import { crearAuthApi, type AuthApi } from "../../api/auth.api";
import { crearSolicitar, type Solicitar } from "../../api/cliente";
import { ErrorRed } from "../../api/errores";
import { borrarSesion, guardarSesion, leerSesion } from "../../api/sesion.almacen";
import { obtenerBaseDeDatos } from "../../db/base-sesion";
import { cerrarCuenta, prepararCuenta } from "../../services/cuenta.servicio";
import type { SesionGuardada } from "../../services/tipos-sesion";
import { ProveedorSesion, useSesion } from "../proveedor-sesion";

jest.mock("../../api/config", () => ({
  leerConfigApi: () => ({ baseUrl: "https://api.example.test" }),
}));
jest.mock("../../api/auth.api");
jest.mock("../../api/cliente");
jest.mock("../../api/tareas.api", () => ({ crearApiTareas: () => ({}) }));
jest.mock("../../api/sesion.almacen");
jest.mock("../../db/base-sesion");
jest.mock("../../services/cuenta.servicio");

const crearAuthApiMock = jest.mocked(crearAuthApi);
const crearSolicitarMock = jest.mocked(crearSolicitar);
const leerSesionMock = jest.mocked(leerSesion);
const guardarSesionMock = jest.mocked(guardarSesion);
const borrarSesionMock = jest.mocked(borrarSesion);
const obtenerBaseDeDatosMock = jest.mocked(obtenerBaseDeDatos);
const prepararCuentaMock = jest.mocked(prepararCuenta);
const cerrarCuentaMock = jest.mocked(cerrarCuenta);

const SESION: SesionGuardada = {
  token: "token-1",
  refreshToken: "refresh-1",
  usuario: { id: "uid-1", email: "persona@ejemplo.test" },
  expiraEn: 1_800_000_000_000,
};

function authFalsa(): AuthApi {
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
  };
}

function solicitarFalso(): Solicitar {
  return (async () => ({ usuario: SESION.usuario })) as unknown as Solicitar;
}

function Sonda() {
  const { estado, usuario, iniciarSesion, cerrarSesion } = useSesion();

  return (
    <>
      <Text testID="estado">{estado}</Text>
      <Text testID="email">{usuario?.email ?? ""}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Entrar"
        onPress={() => {
          void iniciarSesion("persona@ejemplo.test", "contrasena");
        }}
      >
        <Text>Entrar</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Salir"
        onPress={() => {
          void cerrarSesion();
        }}
      >
        <Text>Salir</Text>
      </Pressable>
    </>
  );
}

beforeEach(() => {
  crearAuthApiMock.mockReturnValue(authFalsa());
  crearSolicitarMock.mockReturnValue(solicitarFalso());
  obtenerBaseDeDatosMock.mockResolvedValue({} as never);
  prepararCuentaMock.mockResolvedValue(false);
  cerrarCuentaMock.mockResolvedValue();
  borrarSesionMock.mockResolvedValue();
  guardarSesionMock.mockResolvedValue();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("ProveedorSesion: arranque", () => {
  it("sin sesión guardada queda como invitado", async () => {
    leerSesionMock.mockResolvedValue(null);

    const { getByTestId } = await render(
      <ProveedorSesion>
        <Sonda />
      </ProveedorSesion>,
    );

    await waitFor(() => expect(getByTestId("estado").props.children).toBe("invitado"));
  });

  it("con sesión guardada y sin red conserva la sesión", async () => {
    leerSesionMock.mockResolvedValue(SESION);
    crearSolicitarMock.mockReturnValue((async () => {
      throw new ErrorRed();
    }) as unknown as Solicitar);

    const { getByTestId } = await render(
      <ProveedorSesion>
        <Sonda />
      </ProveedorSesion>,
    );

    await waitFor(() => expect(getByTestId("estado").props.children).toBe("autenticado"));
    expect(getByTestId("email").props.children).toBe("persona@ejemplo.test");
  });
});

describe("ProveedorSesion: acciones", () => {
  it("login guarda la sesión y prepara la cuenta", async () => {
    leerSesionMock.mockResolvedValue(null);

    const { getByLabelText, getByTestId } = await render(
      <ProveedorSesion>
        <Sonda />
      </ProveedorSesion>,
    );
    await waitFor(() => expect(getByTestId("estado").props.children).toBe("invitado"));

    await fireEvent.press(getByLabelText("Entrar"));

    await waitFor(() => expect(getByTestId("estado").props.children).toBe("autenticado"));
    expect(guardarSesionMock).toHaveBeenCalled();
    expect(prepararCuentaMock).toHaveBeenCalledWith(expect.anything(), "uid-1");
  });

  it("cerrar sesión borra tokens y purga los datos locales", async () => {
    leerSesionMock.mockResolvedValue(SESION);

    const { getByLabelText, getByTestId } = await render(
      <ProveedorSesion>
        <Sonda />
      </ProveedorSesion>,
    );
    await waitFor(() => expect(getByTestId("estado").props.children).toBe("autenticado"));

    await fireEvent.press(getByLabelText("Salir"));

    await waitFor(() => expect(getByTestId("estado").props.children).toBe("invitado"));
    expect(borrarSesionMock).toHaveBeenCalled();
    expect(cerrarCuentaMock).toHaveBeenCalled();
  });
});
