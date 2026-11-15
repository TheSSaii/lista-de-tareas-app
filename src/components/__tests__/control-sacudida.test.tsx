import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import { ControlSacudida } from "../control-sacudida";

describe("ControlSacudida", () => {
  it("expone un interruptor accesible y lo activa", async () => {
    const cambiar = jest.fn();
    const { getByLabelText } = await render(
      <ControlSacudida activo={false} estado="inactiva" onCambiar={cambiar} />,
    );

    const interruptor = getByLabelText("Agitar para deshacer");
    expect(interruptor.props.accessibilityState).toEqual({ checked: false });
    await fireEvent(interruptor, "valueChange", true);
    expect(cambiar).toHaveBeenCalledWith(true);
  });

  it("explica cuando el sensor no está disponible", async () => {
    const { getByText } = await render(
      <ControlSacudida activo estado="no-disponible" onCambiar={jest.fn()} />,
    );

    expect(getByText("Este dispositivo no tiene acelerómetro disponible.")).toBeTruthy();
  });

  it("explica cuando falta el permiso de movimiento", async () => {
    const { getByText } = await render(
      <ControlSacudida activo estado="sin-permiso" onCambiar={jest.fn()} />,
    );

    expect(getByText("Sin permiso de movimiento; usa el botón Deshacer.")).toBeTruthy();
  });
});
