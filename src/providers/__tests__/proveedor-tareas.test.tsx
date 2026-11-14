import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

import { obtenerBaseDeDatos } from "../../db/base-sesion";
import { crearBaseFalsa, fila } from "../../testing/base-falsa";
import { ProveedorTareas, useTareas } from "../proveedor-tareas";

jest.mock("../../db/base-sesion", () => ({ obtenerBaseDeDatos: jest.fn() }));

const obtenerBaseDeDatosMock = obtenerBaseDeDatos as jest.MockedFunction<typeof obtenerBaseDeDatos>;

function Sonda() {
  const { tareas, eliminar } = useTareas();

  return (
    <>
      <Text testID="conteo">{String(tareas.length)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Eliminar primera tarea"
        onPress={() => {
          void eliminar(1);
        }}
      >
        <Text>Eliminar</Text>
      </Pressable>
    </>
  );
}

describe("ProveedorTareas", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("eliminar actualiza el estado local del proveedor", async () => {
    const { db, registro } = crearBaseFalsa({ filas: [fila({ id: 1 })] });
    obtenerBaseDeDatosMock.mockResolvedValue(db);

    const { getByLabelText, getByTestId } = await render(
      <ProveedorTareas>
        <Sonda />
      </ProveedorTareas>,
    );

    await waitFor(() => expect(getByTestId("conteo").props.children).toBe("1"));
    await fireEvent.press(getByLabelText("Eliminar primera tarea"));

    await waitFor(() => expect(getByTestId("conteo").props.children).toBe("0"));
    expect(registro.ejecuciones[0]?.sql).toBe("DELETE FROM tarea WHERE id = ?");
  });
});
