import { afterEach, describe, expect, it, jest } from "@jest/globals";

import type { EstadoPermiso, Notificador } from "../notificaciones";
import {
  actualizarNotificacion,
  actualizarRemoto,
  insertarRemoto,
  obtenerPorRemoteId,
} from "../../repositories/tarea.repositorio";
import { crearBaseFalsa } from "../../testing/base-falsa";
import { reconciliarRecordatorio } from "../recordatorios.servicio";
import { bajarCambios } from "../sincronizacion.bajada";
import type { ApiTareas, TareaParaApi, TareaPendiente, TareaRemota } from "../tipos-sincronizacion";

jest.mock("../../repositories/tarea.repositorio");
jest.mock("../recordatorios.servicio");

const obtenerPorRemoteIdMock = jest.mocked(obtenerPorRemoteId);
const insertarRemotoMock = jest.mocked(insertarRemoto);
const actualizarRemotoMock = jest.mocked(actualizarRemoto);
const actualizarNotificacionMock = jest.mocked(actualizarNotificacion);
const reconciliarMock = jest.mocked(reconciliarRecordatorio);

const REMOTO: TareaRemota = {
  id: "uuid-1",
  titulo: "Tarea remota",
  descripcion: null,
  prioridad: 2,
  vence_en: "2026-12-01T10:00:00.000Z",
  completada: false,
  created_at: "2026-11-15T10:00:00.000Z",
  updated_at: "2026-11-15T11:00:00.000Z",
  deleted_at: null,
};

function local(cambios: Partial<TareaPendiente> = {}): TareaPendiente {
  return {
    id: 5,
    titulo: "Local",
    descripcion: null,
    prioridad: 2,
    vence_en: null,
    completada: false,
    notificacion_id: "notif-5",
    remote_id: "uuid-1",
    updated_at: "2026-11-15T10:00:00.000Z",
    deleted: false,
    pending: false,
    ...cambios,
  };
}

function api(items: TareaRemota[], servidorAhora = "2026-11-15T12:00:00.000Z"): ApiTareas {
  return {
    listar: jest.fn(async () => ({ items, servidor_ahora: servidorAhora })),
    guardar: jest.fn(async (id: string, tarea: TareaParaApi) => ({
      ...tarea,
      id,
      created_at: "2026-11-15T10:00:00.000Z",
      updated_at: "2026-11-15T12:00:00.000Z",
      deleted_at: null,
    })),
    eliminar: jest.fn(async () => undefined),
  };
}

const notificador: Notificador = {
  isAvailableAsync: jest.fn(async () => true),
  obtenerPermisoAsync: jest.fn(async (): Promise<EstadoPermiso> => "concedido"),
  pedirPermisoAsync: jest.fn(async (): Promise<EstadoPermiso> => "concedido"),
  programarAsync: jest.fn(async () => "notif-nueva"),
  cancelarAsync: jest.fn(async () => undefined),
};

function dbFalsa() {
  const { db } = crearBaseFalsa();
  const ejecutadas: string[] = [];
  db.execAsync = async (sql) => {
    ejecutadas.push(sql);
  };
  return { db, ejecutadas };
}

afterEach(() => {
  jest.clearAllMocks();
});

describe("bajarCambios: aplicación", () => {
  it("inserta un remoto nuevo, reconcilia y avanza el cursor", async () => {
    obtenerPorRemoteIdMock.mockResolvedValue(null);
    insertarRemotoMock.mockResolvedValue(10);
    reconciliarMock.mockResolvedValue({ tarea: local({ id: 10 }) });
    const { db, ejecutadas } = dbFalsa();

    const resultado = await bajarCambios({
      db,
      api: api([REMOTO]),
      cursor: null,
      notificador,
    });

    expect(ejecutadas).toEqual(["BEGIN", "COMMIT"]);
    expect(insertarRemotoMock).toHaveBeenCalledWith(expect.anything(), REMOTO);
    expect(resultado.bajados).toBe(1);
    expect(resultado.cursor).toBe(REMOTO.updated_at);
  });

  it("no aplica un remoto más viejo que el local pendiente", async () => {
    obtenerPorRemoteIdMock.mockResolvedValue(
      local({ updated_at: "2026-11-15T11:30:00.000Z", pending: true }),
    );
    const { db } = dbFalsa();

    const resultado = await bajarCambios({
      db,
      api: api([REMOTO]),
      cursor: null,
      notificador,
    });

    expect(actualizarRemotoMock).not.toHaveBeenCalled();
    expect(resultado.bajados).toBe(0);
  });
});

describe("bajarCambios: borrados y límites", () => {
  it("una tumba remota borra localmente y cancela la notificación", async () => {
    obtenerPorRemoteIdMock.mockResolvedValue(local());
    reconciliarMock.mockResolvedValue({ tarea: local() });
    const { db } = dbFalsa();

    await bajarCambios({
      db,
      api: api([{ ...REMOTO, deleted_at: "2026-11-15T11:00:00.000Z" }]),
      cursor: null,
      notificador,
    });

    expect(actualizarRemotoMock).toHaveBeenCalled();
    expect(notificador.cancelarAsync).toHaveBeenCalledWith("notif-5");
    expect(actualizarNotificacionMock).toHaveBeenCalledWith(expect.anything(), 5, null);
  });
});

describe("bajarCambios: paginación y formato", () => {
  it("se detiene y avisa si una página completa no avanza el cursor", async () => {
    obtenerPorRemoteIdMock.mockResolvedValue(local());
    const pagina = Array.from({ length: 500 }, () => REMOTO);
    const { db } = dbFalsa();
    const apiFalsa = api(pagina);

    const resultado = await bajarCambios({
      db,
      api: apiFalsa,
      cursor: REMOTO.updated_at,
      notificador,
    });

    expect(resultado.aviso).toContain("cursor");
    expect(resultado.cursor).toBe(REMOTO.updated_at);
    expect(apiFalsa.listar).toHaveBeenCalledTimes(1);
  });

  it("omite un item inválido y sigue con los válidos", async () => {
    obtenerPorRemoteIdMock.mockResolvedValue(null);
    insertarRemotoMock.mockResolvedValue(10);
    reconciliarMock.mockResolvedValue({ tarea: local({ id: 10 }) });
    const { db } = dbFalsa();
    const invalido = { ...REMOTO, id: "uuid-malo", prioridad: 9 } as unknown as TareaRemota;

    const resultado = await bajarCambios({
      db,
      api: api([invalido, REMOTO]),
      cursor: null,
      notificador,
    });

    expect(resultado.bajados).toBe(1);
    expect(resultado.aviso).toContain("omit");
  });
});
