import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { contarPendientes } from "../../repositories/tarea.repositorio";
import { guardarMeta, leerMeta } from "../../repositories/sincronizacion.repositorio";
import { crearBaseFalsa } from "../../testing/base-falsa";
import type { Notificador } from "../notificaciones";
import { bajarCambios } from "../sincronizacion.bajada";
import { sincronizar } from "../sincronizacion";
import { subirPendientes } from "../sincronizacion.subida";
import type { ApiTareas } from "../tipos-sincronizacion";

jest.mock("../sincronizacion.subida");
jest.mock("../sincronizacion.bajada");
jest.mock("../../repositories/tarea.repositorio");
jest.mock("../../repositories/sincronizacion.repositorio");

const subirMock = jest.mocked(subirPendientes);
const bajarMock = jest.mocked(bajarCambios);
const contarMock = jest.mocked(contarPendientes);
const leerMetaMock = jest.mocked(leerMeta);
const guardarMetaMock = jest.mocked(guardarMeta);

const notificador = {} as Notificador;
const api = {} as ApiTareas;
const AHORA = new Date(2026, 10, 15, 12, 0, 0);

afterEach(() => {
  jest.clearAllMocks();
});

describe("sincronizar", () => {
  it("sube, baja, persiste el cursor y calcula el estado", async () => {
    leerMetaMock.mockResolvedValue("2026-11-15T10:00:00.000Z");
    subirMock.mockResolvedValue(2);
    bajarMock.mockResolvedValue({ cursor: "2026-11-15T11:00:00.000Z", bajados: 3 });
    contarMock.mockResolvedValue(1);
    guardarMetaMock.mockResolvedValue();

    const resultado = await sincronizar({
      db: crearBaseFalsa().db,
      api,
      notificador,
      ahora: AHORA,
    });

    expect(subirMock).toHaveBeenCalled();
    expect(bajarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: "2026-11-15T10:00:00.000Z",
      }),
    );
    expect(guardarMetaMock).toHaveBeenCalledWith(
      expect.anything(),
      "tareas_since",
      "2026-11-15T11:00:00.000Z",
    );
    expect(resultado).toMatchObject({
      estado: "pendiente",
      subidos: 2,
      bajados: 3,
      pendientes: 1,
    });
  });
});

describe("sincronizar: sin pendientes", () => {
  it("sin pendientes queda al día", async () => {
    leerMetaMock.mockResolvedValue(null);
    subirMock.mockResolvedValue(0);
    bajarMock.mockResolvedValue({ cursor: "2026-11-15T12:00:00.000Z", bajados: 0 });
    contarMock.mockResolvedValue(0);
    guardarMetaMock.mockResolvedValue();

    const resultado = await sincronizar({
      db: crearBaseFalsa().db,
      api,
      notificador,
      ahora: AHORA,
    });

    expect(resultado.estado).toBe("al-dia");
    expect(resultado.pendientes).toBe(0);
  });
});
