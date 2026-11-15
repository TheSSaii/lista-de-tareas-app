import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { borrarTodasLasTareas, contarTareas } from "../../repositories/tarea.repositorio";
import {
  guardarMeta,
  leerMeta,
  limpiarSincronizacion,
} from "../../repositories/sincronizacion.repositorio";
import { crearBaseFalsa } from "../../testing/base-falsa";
import {
  cerrarCuenta,
  descartarDatosLocales,
  hayDatosLocales,
  prepararCuenta,
} from "../cuenta.servicio";

jest.mock("../../repositories/tarea.repositorio");
jest.mock("../../repositories/sincronizacion.repositorio");

const contarMock = jest.mocked(contarTareas);
const borrarMock = jest.mocked(borrarTodasLasTareas);
const leerMetaMock = jest.mocked(leerMeta);
const guardarMetaMock = jest.mocked(guardarMeta);
const limpiarMock = jest.mocked(limpiarSincronizacion);

afterEach(() => {
  jest.clearAllMocks();
});

describe("cuenta.servicio: datos locales", () => {
  it("detecta datos locales solo si no hay usuario asociado", async () => {
    contarMock.mockResolvedValue(2);

    leerMetaMock.mockResolvedValue(null);
    await expect(hayDatosLocales(crearBaseFalsa().db)).resolves.toBe(true);

    leerMetaMock.mockResolvedValue("uid-1");
    await expect(hayDatosLocales(crearBaseFalsa().db)).resolves.toBe(false);
  });

  it("purga tareas y metadatos en una transacción", async () => {
    borrarMock.mockResolvedValue();
    limpiarMock.mockResolvedValue();
    const { db } = crearBaseFalsa();
    const ejecutadas: string[] = [];
    db.execAsync = async (sql) => {
      ejecutadas.push(sql);
    };

    await descartarDatosLocales(db);

    expect(ejecutadas).toEqual(["BEGIN", "COMMIT"]);
    expect(borrarMock).toHaveBeenCalled();
    expect(limpiarMock).toHaveBeenCalled();
  });
});

describe("cuenta.servicio: preparación", () => {
  it("prepararCuenta purga al cambiar de usuario y guarda el nuevo", async () => {
    leerMetaMock.mockResolvedValue("uid-anterior");
    contarMock.mockResolvedValue(1);
    borrarMock.mockResolvedValue();
    limpiarMock.mockResolvedValue();
    guardarMetaMock.mockResolvedValue();
    const { db } = crearBaseFalsa();

    await expect(prepararCuenta(db, "uid-nuevo")).resolves.toBe(true);

    expect(borrarMock).toHaveBeenCalled();
    expect(guardarMetaMock).toHaveBeenCalledWith(expect.anything(), "usuario_id", "uid-nuevo");
  });

  it("prepararCuenta no purga si ya es el mismo usuario", async () => {
    leerMetaMock.mockResolvedValue("uid-1");
    contarMock.mockResolvedValue(3);
    guardarMetaMock.mockResolvedValue();

    await expect(prepararCuenta(crearBaseFalsa().db, "uid-1")).resolves.toBe(false);
    expect(borrarMock).not.toHaveBeenCalled();
  });

  it("cerrarCuenta deja la base sin datos de la sesión", async () => {
    borrarMock.mockResolvedValue();
    limpiarMock.mockResolvedValue();

    await cerrarCuenta(crearBaseFalsa().db);

    expect(borrarMock).toHaveBeenCalled();
    expect(limpiarMock).toHaveBeenCalled();
  });
});
