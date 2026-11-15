import {
  AndroidImportance,
  IosAuthorizationStatus,
  SchedulableTriggerInputTypes,
  cancelScheduledNotificationAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from "expo-notifications";
import type { DateTriggerInput, NotificationPermissionsStatus } from "expo-notifications";
import { Platform } from "react-native";

export const CANAL_ANDROID = "recordatorios";

export type EstadoPermiso = "concedido" | "denegado" | "indeterminado";

export type AvisoProgramado = {
  tareaId: number;
  titulo: string;
  cuerpo: string;
  fecha: Date;
};

export type Notificador = {
  isAvailableAsync: () => Promise<boolean>;
  obtenerPermisoAsync: () => Promise<EstadoPermiso>;
  pedirPermisoAsync: () => Promise<EstadoPermiso>;
  programarAsync: (aviso: AvisoProgramado) => Promise<string | null>;
  cancelarAsync: (notificacionId: string) => Promise<void>;
};

function aEstadoPermiso(permiso: NotificationPermissionsStatus): EstadoPermiso {
  if (permiso.granted || permiso.ios?.status === IosAuthorizationStatus.PROVISIONAL) {
    return "concedido";
  }

  if (permiso.status === "undetermined" || permiso.canAskAgain === true) {
    return "indeterminado";
  }

  return "denegado";
}

function configurarCanal(): Promise<void> {
  return setNotificationChannelAsync(CANAL_ANDROID, {
    name: "Recordatorios",
    description: "Avisos de tareas que están por vencer",
    importance: AndroidImportance.DEFAULT,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#208AEF",
  }).then(() => undefined);
}

/** El canal se crea una sola vez por instancia del notificador. */
function crearAseguradorCanal(plataforma: string): () => Promise<void> {
  let canalListo: Promise<void> | null = null;

  return async () => {
    if (plataforma !== "android") {
      return;
    }

    if (canalListo === null) {
      canalListo = configurarCanal();
    }

    try {
      await canalListo;
    } catch (error) {
      canalListo = null;
      throw error;
    }
  };
}

function crearDisponibilidad(plataforma: string): Notificador["isAvailableAsync"] {
  return async () => {
    if (plataforma === "web") {
      return false;
    }

    try {
      await getPermissionsAsync();
      return true;
    } catch {
      return false;
    }
  };
}

function crearProgramador(
  plataforma: string,
  asegurarCanal: () => Promise<void>,
): Notificador["programarAsync"] {
  return async (aviso) => {
    if (plataforma === "web") {
      return null;
    }

    try {
      await asegurarCanal();
      const trigger: DateTriggerInput = {
        type: SchedulableTriggerInputTypes.DATE,
        date: aviso.fecha,
        ...(plataforma === "android" ? { channelId: CANAL_ANDROID } : {}),
      };

      return await scheduleNotificationAsync({
        content: {
          title: aviso.titulo,
          body: aviso.cuerpo,
          sound: "default",
          data: { tareaId: aviso.tareaId },
        },
        trigger,
      });
    } catch {
      return null;
    }
  };
}

async function cancelarNotificacion(notificacionId: string): Promise<void> {
  try {
    await cancelScheduledNotificationAsync(notificacionId);
  } catch {
    return;
  }
}

export function crearNotificador(plataforma: string = Platform.OS): Notificador {
  return {
    isAvailableAsync: crearDisponibilidad(plataforma),
    obtenerPermisoAsync: async () => aEstadoPermiso(await getPermissionsAsync()),
    pedirPermisoAsync: async () => aEstadoPermiso(await requestPermissionsAsync()),
    programarAsync: crearProgramador(plataforma, crearAseguradorCanal(plataforma)),
    cancelarAsync: cancelarNotificacion,
  };
}

export function configurarNotificaciones(plataforma: string = Platform.OS): void {
  if (plataforma === "web") {
    return;
  }

  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export const notificadorExpo: Notificador = crearNotificador();
