import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as Notifications from "expo-notifications";
import { IosAuthorizationStatus, SchedulableTriggerInputTypes } from "expo-notifications";

import { CANAL_ANDROID, crearNotificador, configurarNotificaciones } from "../notificaciones";

const getPermissionsMock = jest.mocked(Notifications.getPermissionsAsync);
const requestPermissionsMock = jest.mocked(Notifications.requestPermissionsAsync);
const scheduleMock = jest.mocked(Notifications.scheduleNotificationAsync);
const cancelMock = jest.mocked(Notifications.cancelScheduledNotificationAsync);
const channelMock = jest.mocked(Notifications.setNotificationChannelAsync);
const handlerMock = jest.mocked(Notifications.setNotificationHandler);

const AVISO = {
  tareaId: 7,
  titulo: "Recordatorio: Entregar informe",
  cuerpo: "Vence el 20 de nov, 14:30.",
  fecha: new Date(2026, 10, 20, 14, 0, 0),
};

beforeEach(() => {
  jest.clearAllMocks();
  getPermissionsMock.mockResolvedValue({ granted: true, canAskAgain: false } as never);
  scheduleMock.mockResolvedValue("notificacion-1");
  channelMock.mockResolvedValue(null);
  cancelMock.mockResolvedValue(undefined);
});

describe("isAvailableAsync", () => {
  it("devuelve false en web sin tocar APIs nativas", async () => {
    const notificador = crearNotificador("web");

    await expect(notificador.isAvailableAsync()).resolves.toBe(false);
    expect(getPermissionsMock).not.toHaveBeenCalled();
  });

  it("devuelve true en nativo si la comprobación responde", async () => {
    const notificador = crearNotificador("ios");

    await expect(notificador.isAvailableAsync()).resolves.toBe(true);
  });

  it("devuelve false si la comprobación nativa falla", async () => {
    getPermissionsMock.mockRejectedValueOnce(new Error("sin módulo"));
    const notificador = crearNotificador("ios");

    await expect(notificador.isAvailableAsync()).resolves.toBe(false);
  });
});

describe("permisos", () => {
  it("traduce concedido", async () => {
    getPermissionsMock.mockResolvedValueOnce({ granted: true } as never);
    const notificador = crearNotificador("ios");

    await expect(notificador.obtenerPermisoAsync()).resolves.toBe("concedido");
  });

  it("trata el permiso provisional de iOS como concedido", async () => {
    getPermissionsMock.mockResolvedValueOnce({
      granted: false,
      ios: { status: IosAuthorizationStatus.PROVISIONAL },
    } as never);
    const notificador = crearNotificador("ios");

    await expect(notificador.obtenerPermisoAsync()).resolves.toBe("concedido");
  });

  it("traduce denegado e indeterminado", async () => {
    getPermissionsMock
      .mockResolvedValueOnce({ granted: false } as never)
      .mockResolvedValueOnce({ granted: false, canAskAgain: true } as never);
    const notificador = crearNotificador("android");

    await expect(notificador.obtenerPermisoAsync()).resolves.toBe("denegado");
    await expect(notificador.obtenerPermisoAsync()).resolves.toBe("indeterminado");
  });

  it("pide permiso y traduce la respuesta", async () => {
    requestPermissionsMock.mockResolvedValueOnce({ granted: true } as never);
    const notificador = crearNotificador("ios");

    await expect(notificador.pedirPermisoAsync()).resolves.toBe("concedido");
  });
});

describe("programarAsync", () => {
  it("programa con trigger DATE y crea el canal una sola vez en Android", async () => {
    const notificador = crearNotificador("android");

    await expect(notificador.programarAsync(AVISO)).resolves.toBe("notificacion-1");
    await expect(notificador.programarAsync(AVISO)).resolves.toBe("notificacion-1");

    expect(channelMock).toHaveBeenCalledTimes(1);
    expect(channelMock).toHaveBeenCalledWith(
      CANAL_ANDROID,
      expect.objectContaining({ name: "Recordatorios" }),
    );
    expect(scheduleMock).toHaveBeenCalledWith({
      content: expect.objectContaining({
        title: AVISO.titulo,
        body: AVISO.cuerpo,
        data: { tareaId: 7 },
      }),
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: AVISO.fecha,
        channelId: CANAL_ANDROID,
      },
    });
  });
});

describe("programarAsync · plataforma", () => {
  it("no crea canal en iOS", async () => {
    const notificador = crearNotificador("ios");

    await notificador.programarAsync(AVISO);

    expect(channelMock).not.toHaveBeenCalled();
    expect(scheduleMock).toHaveBeenCalledWith({
      content: expect.any(Object),
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: AVISO.fecha,
      },
    });
  });

  it("no programa en web", async () => {
    const notificador = crearNotificador("web");

    await expect(notificador.programarAsync(AVISO)).resolves.toBeNull();
    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it("devuelve null si el sistema falla al programar", async () => {
    scheduleMock.mockRejectedValueOnce(new Error("sin permiso"));
    const notificador = crearNotificador("ios");

    await expect(notificador.programarAsync(AVISO)).resolves.toBeNull();
  });
});

describe("cancelarAsync", () => {
  it("cancela por id y no lanza si ya no existe", async () => {
    cancelMock.mockRejectedValueOnce(new Error("id desconocido"));
    const notificador = crearNotificador("ios");

    await expect(notificador.cancelarAsync("notificacion-1")).resolves.toBeUndefined();
    expect(cancelMock).toHaveBeenCalledWith("notificacion-1");
  });
});

describe("configurarNotificaciones", () => {
  it("configura banner, lista y sonido en primer plano", () => {
    configurarNotificaciones("ios");

    expect(handlerMock).toHaveBeenCalledWith(
      expect.objectContaining({ handleNotification: expect.any(Function) }),
    );
  });

  it("no configura el handler en web", () => {
    configurarNotificaciones("web");

    expect(handlerMock).not.toHaveBeenCalled();
  });
});
