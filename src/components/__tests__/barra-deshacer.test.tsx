import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import { BarraDeshacer } from "../barra-deshacer";

describe("BarraDeshacer", () => {
  it("muestra un botón deshabilitado cuando no hay acción", async () => {
    const { getByLabelText } = await render(
      <BarraDeshacer puedeDeshacer={false} onDeshacer={jest.fn()} />,
    );

    const boton = getByLabelText("Deshacer última acción");
    expect(boton.props.accessibilityState).toEqual({ disabled: true });
  });

  it("deshace cuando hay una acción disponible", async () => {
    const deshacer = jest.fn();
    const { getByLabelText } = await render(<BarraDeshacer puedeDeshacer onDeshacer={deshacer} />);

    await fireEvent.press(getByLabelText("Deshacer última acción"));
    expect(deshacer).toHaveBeenCalledTimes(1);
  });
});
