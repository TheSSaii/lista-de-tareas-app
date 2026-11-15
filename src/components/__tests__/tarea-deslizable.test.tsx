import { describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";

import type { Tarea } from "../../services/tarea";
import { TareaDeslizable } from "../tarea-deslizable";

const TAREA: Tarea = {
  id: 1,
  titulo: "Comprar pan",
  descripcion: null,
  prioridad: 2,
  vence_en: "2026-11-20",
  completada: false,
  notificacion_id: null,
};

describe("TareaDeslizable", () => {
  it("renderiza la tarjeta con sus botones equivalentes", async () => {
    const { getByLabelText, getByTestId } = await render(
      <TareaDeslizable
        tarea={TAREA}
        onAlternar={jest.fn()}
        onPosponer={jest.fn()}
        onEditar={jest.fn()}
      />,
    );

    expect(getByTestId("tarea-deslizable")).toBeTruthy();
    expect(getByLabelText("Marcar como completada: Comprar pan")).toBeTruthy();
    expect(getByLabelText("Posponer un día: Comprar pan")).toBeTruthy();
    expect(getByLabelText("Editar tarea: Comprar pan")).toBeTruthy();
  });
});
