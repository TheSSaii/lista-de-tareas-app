import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Accelerometer } from "expo-sensors";

import { useSacudida } from "../use-sacudida";

const disponibleMock = jest.mocked(Accelerometer.isAvailableAsync);
const permisoMock = jest.mocked(Accelerometer.getPermissionsAsync);
const pedirMock = jest.mocked(Accelerometer.requestPermissionsAsync);
const intervaloMock = jest.mocked(Accelerometer.setUpdateInterval);
const escucharMock = jest.mocked(Accelerometer.addListener);

let emitir: ((medicion: { x: number; y: number; z: number; timestamp: number }) => void) | null =
  null;
const remover = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  emitir = null;
  disponibleMock.mockResolvedValue(true);
  permisoMock.mockResolvedValue({ granted: true } as never);
  pedirMock.mockResolvedValue({ granted: true } as never);
  escucharMock.mockImplementation((listener) => {
    emitir = listener;
    return { remove: remover };
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useSacudida", () => {
  it("no hace nada mientras está inactiva", async () => {
    const { result } = await renderHook(() => useSacudida(false, jest.fn()));

    expect(result.current.estado).toBe("inactiva");
    expect(disponibleMock).not.toHaveBeenCalled();
  });

  it("informa si el sensor no está disponible y no se suscribe", async () => {
    disponibleMock.mockResolvedValueOnce(false);
    const { result } = await renderHook(() => useSacudida(true, jest.fn()));

    await waitFor(() => expect(result.current.estado).toBe("no-disponible"));
    expect(escucharMock).not.toHaveBeenCalled();
  });

  it("informa no-disponible si la comprobación lanza", async () => {
    disponibleMock.mockRejectedValueOnce(new Error("sin módulo"));
    const { result } = await renderHook(() => useSacudida(true, jest.fn()));

    await waitFor(() => expect(result.current.estado).toBe("no-disponible"));
  });

  it("pide permiso y no se suscribe si se deniega", async () => {
    permisoMock.mockResolvedValueOnce({ granted: false } as never);
    pedirMock.mockResolvedValueOnce({ granted: false } as never);
    const { result } = await renderHook(() => useSacudida(true, jest.fn()));

    await waitFor(() => expect(result.current.estado).toBe("sin-permiso"));
    expect(pedirMock).toHaveBeenCalledTimes(1);
    expect(escucharMock).not.toHaveBeenCalled();
  });
});

describe("useSacudida · suscripción", () => {
  it("se suscribe, configura el intervalo y dispara una vez por enfriamiento", async () => {
    const reloj = jest.spyOn(Date, "now");
    reloj.mockReturnValue(10_000);
    const alSacudir = jest.fn();
    const { result, unmount } = await renderHook(() => useSacudida(true, alSacudir));

    await waitFor(() => expect(result.current.estado).toBe("activa"));
    expect(intervaloMock).toHaveBeenCalledWith(100);

    await act(async () => {
      emitir?.({ x: 3, y: 0, z: 0, timestamp: 0 });
    });
    expect(alSacudir).toHaveBeenCalledTimes(1);

    await act(async () => {
      emitir?.({ x: 3, y: 0, z: 0, timestamp: 0 });
    });
    expect(alSacudir).toHaveBeenCalledTimes(1);

    reloj.mockReturnValue(11_100);
    await act(async () => {
      emitir?.({ x: 3, y: 0, z: 0, timestamp: 0 });
    });
    expect(alSacudir).toHaveBeenCalledTimes(2);

    await unmount();
    expect(remover).toHaveBeenCalledTimes(1);
  });

  it("cancela la suscripción al apagar el interruptor", async () => {
    const { result, rerender } = await renderHook(
      ({ activo }: { activo: boolean }) => useSacudida(activo, jest.fn()),
      { initialProps: { activo: true } },
    );

    await waitFor(() => expect(result.current.estado).toBe("activa"));
    await rerender({ activo: false });

    expect(remover).toHaveBeenCalledTimes(1);
    expect(result.current.estado).toBe("inactiva");
  });
});
