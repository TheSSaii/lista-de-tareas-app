import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import { EstadoSincronizacion } from "../estado-sincronizacion";

describe("EstadoSincronizacion", () => {
  it("muestra los pendientes y permite sincronizar con botón accesible", async () => {
    const onSincronizar = jest.fn();
    const { getByText, getByLabelText } = await render(
      <EstadoSincronizacion estado="pendiente" pendientes={2} onSincronizar={onSincronizar} />,
    );

    expect(getByText("2 cambios pendientes")).toBeTruthy();
    await fireEvent.press(getByLabelText("Sincronizar ahora"));
    expect(onSincronizar).toHaveBeenCalled();
  });

  it("no se renderiza sin sesión activa", async () => {
    const { toJSON } = await render(
      <EstadoSincronizacion estado="inactivo" pendientes={0} onSincronizar={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });
});
