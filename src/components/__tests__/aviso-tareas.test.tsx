import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import { AvisoTareas } from "../aviso-tareas";

describe("AvisoTareas", () => {
  it("no renderiza nada sin aviso", async () => {
    const { toJSON } = await render(<AvisoTareas aviso={null} onCerrar={jest.fn()} />);

    expect(toJSON()).toBeNull();
  });

  it("muestra el aviso con role alert y permite cerrarlo", async () => {
    const cerrar = jest.fn();
    const { getByText, getByLabelText } = await render(
      <AvisoTareas aviso="La tarea se guardó, pero no hay permiso." onCerrar={cerrar} />,
    );

    expect(getByText("La tarea se guardó, pero no hay permiso.").props.accessibilityRole).toBe(
      "alert",
    );
    await fireEvent.press(getByLabelText("Cerrar aviso"));
    expect(cerrar).toHaveBeenCalledTimes(1);
  });
});
