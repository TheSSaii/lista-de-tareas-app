import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import type { Tarea } from "../../services/tarea";
import { TareaItem } from "../tarea-item";

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

describe("TareaItem · acciones", () => {
  it("expone botones accesibles equivalentes a los gestos", async () => {
    const alCompletar = jest.fn();
    const alPosponer = jest.fn();
    const alEditar = jest.fn();
    const { getByLabelText } = await render(
      <TareaItem
        tarea={tarea()}
        onAlternar={alCompletar}
        onPosponer={alPosponer}
        onEditar={alEditar}
      />,
    );

    await fireEvent.press(getByLabelText("Marcar como completada: Comprar pan"));
    await fireEvent.press(getByLabelText("Posponer un día: Comprar pan"));
    await fireEvent.press(getByLabelText("Editar tarea: Comprar pan"));

    expect(alCompletar).toHaveBeenCalledWith(tarea());
    expect(alPosponer).toHaveBeenCalledWith(tarea());
    expect(alEditar).toHaveBeenCalledWith(tarea());
  });

  it("mantiene la etiqueta de desmarcar cuando la tarea está completada", async () => {
    const { getByLabelText } = await render(
      <TareaItem
        tarea={tarea({ completada: true })}
        onAlternar={jest.fn()}
        onPosponer={jest.fn()}
        onEditar={jest.fn()}
      />,
    );

    expect(getByLabelText("Marcar como pendiente: Comprar pan")).toBeTruthy();
  });
});
