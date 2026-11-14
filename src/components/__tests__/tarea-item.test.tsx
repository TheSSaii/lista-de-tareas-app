import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import type { Tarea } from "../../services/tarea";
import { COLOR_ALERTA, TareaItem } from "../tarea-item";

const AHORA = new Date(2026, 10, 14, 12, 0, 0);

function tarea(cambios: Partial<Tarea> = {}): Tarea {
  return {
    id: 1,
    titulo: "Comprar pan",
    descripcion: null,
    prioridad: 2,
    vence_en: "2026-11-10",
    completada: false,
    notificacion_id: null,
    ...cambios,
  };
}

describe("TareaItem", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(AHORA);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("marca una tarea vencida con estilo de alerta y etiqueta accesible", async () => {
    const { getByLabelText, getByTestId } = await render(
      <TareaItem tarea={tarea()} onAlternar={jest.fn()} />,
    );

    expect(getByLabelText("Comprar pan, tarea vencida")).toBeTruthy();
    expect(getByLabelText("Tarea vencida")).toBeTruthy();

    const estilo = StyleSheet.flatten(getByTestId("tarea-item").props.style);
    expect(estilo.borderColor).toBe(COLOR_ALERTA);
  });
});
