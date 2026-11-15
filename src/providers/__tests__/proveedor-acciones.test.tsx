import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

import { AvisoGlobal } from "../../components/aviso-tareas";
import { obtenerBaseDeDatos } from "../../db/base-sesion";
import {
  alternarTareaConRecordatorio,
  crearTareaConRecordatorio,
  posponerTareaConRecordatorio,
  restaurarTareaConRecordatorio,
} from "../../services/recordatorios.servicio";
import type { Tarea } from "../../services/tarea";
import type { EntradaTarea } from "../../services/tareas.servicio";
import { crearBaseFalsa, fila } from "../../testing/base-falsa";
import { ProveedorTareas, useTareas } from "../proveedor-tareas";

jest.mock("../../db/base-sesion", () => ({ obtenerBaseDeDatos: jest.fn() }));
jest.mock("../proveedor-sesion", () => ({
  useSesion: () => ({
    estado: "autenticado",
    usuario: { id: "uid-1", email: "persona@ejemplo.test" },
    apiTareas: null,
    errorConfig: null,
  }),
}));
jest.mock("../../services/notificaciones", () => ({
  configurarNotificaciones: jest.fn(),
  notificadorExpo: {},
}));
jest.mock("../../services/recordatorios.servicio", () => ({
  alternarTareaConRecordatorio: jest.fn(),
  actualizarTareaConRecordatorio: jest.fn(),
  crearTareaConRecordatorio: jest.fn(),
  eliminarTareaConRecordatorio: jest.fn(),
  posponerTareaConRecordatorio: jest.fn(),
  restaurarTareaConRecordatorio: jest.fn(),
}));

const baseMock = jest.mocked(obtenerBaseDeDatos);
const crearMock = jest.mocked(crearTareaConRecordatorio);
const alternarMock = jest.mocked(alternarTareaConRecordatorio);
const posponerMock = jest.mocked(posponerTareaConRecordatorio);
const restaurarMock = jest.mocked(restaurarTareaConRecordatorio);

const ENTRADA: EntradaTarea = {
  titulo: "Entregar informe",
  descripcion: null,
  prioridad: 2,
  vence_en: new Date(2026, 10, 20, 15).toISOString(),
};

function tarea(cambios: Partial<Tarea> = {}): Tarea {
  return {
    id: 1,
    titulo: "Comprar pan",
    descripcion: null,
    prioridad: 2,
    vence_en: "2026-11-20",
    completada: false,
    notificacion_id: null,
    ...cambios,
  };
}

function Sonda() {
  const { tareas, crear, alternar, posponer, deshacer, puedeDeshacer, descartarAviso } =
    useTareas();
  const primera = tareas[0];

  return (
    <>
      <Text testID="conteo">{String(tareas.length)}</Text>
      <Text testID="completada">{String(primera?.completada ?? false)}</Text>
      <Text testID="puede-desHacer">{String(puedeDeshacer)}</Text>
      <Pressable accessibilityLabel="Crear" onPress={() => void crear(ENTRADA)}>
        <Text>Crear</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Completar"
        onPress={() => {
          if (primera !== undefined) alternar(primera);
        }}
      >
        <Text>Completar</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Posponer"
        onPress={() => {
          if (primera !== undefined) posponer(primera);
        }}
      >
        <Text>Posponer</Text>
      </Pressable>
      <Pressable accessibilityLabel="Deshacer" onPress={deshacer}>
        <Text>Deshacer</Text>
      </Pressable>
      <Pressable accessibilityLabel="Descartar aviso" onPress={descartarAviso}>
        <Text>Descartar</Text>
      </Pressable>
    </>
  );
}

function baseConTarea() {
  const { db } = crearBaseFalsa({ filas: [fila({ id: 1 })], fila: fila({ id: 1 }) });
  baseMock.mockResolvedValue(db);
}

function renderSonda() {
  return render(
    <ProveedorTareas>
      <Sonda />
      <AvisoGlobal />
    </ProveedorTareas>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  baseConTarea();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("ProveedorTareas · aviso y deshacer", () => {
  it("guarda la tarea y expone el aviso cuando se deniega el permiso", async () => {
    crearMock.mockResolvedValue({
      ok: true,
      tarea: tarea(),
      aviso: "La tarea se guardó, pero no hay permiso para mostrar recordatorios.",
    });
    const { getByLabelText, getByTestId, getByText } = await renderSonda();

    await waitFor(() => expect(getByTestId("conteo").props.children).toBe("1"));
    await fireEvent.press(getByLabelText("Crear"));

    await waitFor(() => expect(getByTestId("conteo").props.children).toBe("2"));
    expect(
      getByText("La tarea se guardó, pero no hay permiso para mostrar recordatorios."),
    ).toBeTruthy();
    expect(
      getByText("La tarea se guardó, pero no hay permiso para mostrar recordatorios.").props
        .accessibilityRole,
    ).toBe("alert");
  });

  it("deshace después de completar y restaura el estado pendiente", async () => {
    alternarMock.mockResolvedValue({ tarea: tarea({ completada: true }) });
    restaurarMock.mockResolvedValue({ ok: true, tarea: tarea({ completada: false }) });
    const { getByLabelText, getByTestId } = await renderSonda();

    await waitFor(() => expect(getByTestId("conteo").props.children).toBe("1"));
    await fireEvent.press(getByLabelText("Completar"));

    await waitFor(() => expect(getByTestId("completada").props.children).toBe("true"));
    expect(getByTestId("puede-desHacer").props.children).toBe("true");

    await fireEvent.press(getByLabelText("Deshacer"));

    await waitFor(() => expect(getByTestId("completada").props.children).toBe("false"));
    expect(getByTestId("puede-desHacer").props.children).toBe("false");
    expect(restaurarMock).toHaveBeenCalledTimes(1);
  });
});

describe("ProveedorTareas · avisos de acción", () => {
  it("avisa y no cambia el estado al posponer una tarea sin fecha", async () => {
    posponerMock.mockResolvedValue({
      ok: false,
      aviso: "Esta tarea no tiene fecha; edítala para asignar una.",
    });
    const { getByLabelText, getByTestId, getByText } = await renderSonda();

    await waitFor(() => expect(getByTestId("conteo").props.children).toBe("1"));
    await fireEvent.press(getByLabelText("Posponer"));

    await waitFor(() =>
      expect(getByText("Esta tarea no tiene fecha; edítala para asignar una.")).toBeTruthy(),
    );
    expect(getByTestId("puede-desHacer").props.children).toBe("false");
  });

  it("permite descartar el aviso", async () => {
    crearMock.mockResolvedValue({ ok: true, tarea: tarea(), aviso: "Aviso de prueba" });
    const { getByLabelText, getByTestId, queryByText } = await renderSonda();

    await fireEvent.press(getByLabelText("Crear"));
    await waitFor(() => expect(queryByText("Aviso de prueba")).not.toBeNull());

    await fireEvent.press(getByLabelText("Descartar aviso"));
    await waitFor(() => expect(queryByText("Aviso de prueba")).toBeNull());
    expect(getByTestId("conteo").props.children).toBe("2");
  });
});
