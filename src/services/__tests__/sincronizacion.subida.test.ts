import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { ErrorApi, ErrorRed } from "../../api/errores";
import {
  asignarRemoteId,
  listarPendientes,
  marcarSincronizada,
} from "../../repositories/tarea.repositorio";
import { crearBaseFalsa } from "../../testing/base-falsa";
import { subirPendientes } from "../sincronizacion.subida";
import type { ApiTareas, TareaParaApi, TareaPendiente } from "../tipos-sincronizacion";

jest.mock("../../repositories/tarea.repositorio");

const listarPendientesMock = jest.mocked(listarPendientes);
const asignarRemoteIdMock = jest.mocked(asignarRemoteId);
const marcarSincronizadaMock = jest.mocked(marcarSincronizada);

function pendiente(cambios: Partial<TareaPendiente> = {}): TareaPendiente {
  return {
    id: 1,
    titulo: "Entregar informe",
    descripcion: null,
    prioridad: 2,
    vence_en: null,
    completada: false,
    notificacion_id: "notif-local",
    remote_id: "uuid-1",
    updated_at: "2026-11-15T10:00:00.000Z",
    deleted: false,
    pending: true,
    ...cambios,
  };
}

function api(cambios: Partial<ApiTareas> = {}): ApiTareas {
  return {
    listar: jest.fn(async () => ({ items: [], servidor_ahora: "2026-11-15T10:00:00.000Z" })),
    guardar: jest.fn(async (id: string, tarea: TareaParaApi) => ({
      ...tarea,
      id,
      created_at: "2026-11-15T10:00:00.000Z",
      updated_at: "2026-11-15T12:00:00.000Z",
      deleted_at: null,
    })),
    eliminar: jest.fn(async () => undefined),
    ...cambios,
  };
}

afterEach(() => {
  jest.clearAllMocks();
});

describe("subirPendientes: escritura", () => {
  it("sube un pendiente con PUT y guarda el updated_at del servidor", async () => {
    listarPendientesMock.mockResolvedValue([pendiente()]);
    marcarSincronizadaMock.mockResolvedValue(true);
    const apiFalsa = api();

    const subidos = await subirPendientes({ db: crearBaseFalsa().db, api: apiFalsa });

    expect(subidos).toBe(1);
    expect(apiFalsa.guardar).toHaveBeenCalledWith("uuid-1", {
      titulo: "Entregar informe",
      descripcion: null,
      prioridad: 2,
      vence_en: null,
      completada: false,
    });
    expect(marcarSincronizadaMock).toHaveBeenCalledWith(
      expect.anything(),
      1,
      "2026-11-15T12:00:00.000Z",
    );
  });
});

describe("subirPendientes: borrados", () => {
  it("un borrado lógico se envía con DELETE", async () => {
    listarPendientesMock.mockResolvedValue([pendiente({ deleted: true })]);
    marcarSincronizadaMock.mockResolvedValue(true);
    const apiFalsa = api();

    await subirPendientes({
      db: crearBaseFalsa().db,
      api: apiFalsa,
      ahora: () => "2026-11-15T12:00:00.000Z",
    });

    expect(apiFalsa.eliminar).toHaveBeenCalledWith("uuid-1");
    expect(apiFalsa.guardar).not.toHaveBeenCalled();
    expect(marcarSincronizadaMock).toHaveBeenCalledWith(
      expect.anything(),
      1,
      "2026-11-15T12:00:00.000Z",
    );
  });

  it("un 404 al borrar es idempotente", async () => {
    listarPendientesMock.mockResolvedValue([pendiente({ deleted: true })]);
    marcarSincronizadaMock.mockResolvedValue(true);
    const apiFalsa = api({
      eliminar: jest.fn(async () => {
        throw new ErrorApi(404, "No existe.");
      }),
    });

    await expect(
      subirPendientes({
        db: crearBaseFalsa().db,
        api: apiFalsa,
        ahora: () => "2026-11-15T12:00:00.000Z",
      }),
    ).resolves.toBe(1);
  });
});

describe("subirPendientes: identidad y fallos", () => {
  it("asigna remote_id a una fila antigua antes del PUT", async () => {
    listarPendientesMock.mockResolvedValue([pendiente({ remote_id: null })]);
    asignarRemoteIdMock.mockResolvedValue(true);
    marcarSincronizadaMock.mockResolvedValue(true);
    const apiFalsa = api();

    await subirPendientes({
      db: crearBaseFalsa().db,
      api: apiFalsa,
      generarId: () => "uuid-nuevo",
    });

    expect(asignarRemoteIdMock).toHaveBeenCalledWith(expect.anything(), 1, "uuid-nuevo");
    expect(apiFalsa.guardar).toHaveBeenCalledWith("uuid-nuevo", expect.anything());
  });
});

describe("subirPendientes: red", () => {
  it("un error de red conserva el pendiente y no lo marca sincronizado", async () => {
    listarPendientesMock.mockResolvedValue([pendiente()]);
    const apiFalsa = api({
      guardar: jest.fn(async () => {
        throw new ErrorRed();
      }),
    });

    await expect(
      subirPendientes({ db: crearBaseFalsa().db, api: apiFalsa }),
    ).rejects.toBeInstanceOf(ErrorRed);
    expect(marcarSincronizadaMock).not.toHaveBeenCalled();
  });
});
