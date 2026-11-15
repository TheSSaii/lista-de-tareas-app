import { describe, expect, it } from "@jest/globals";

import type { Tarea } from "../tarea";
import {
  HISTORIAL_VACIO,
  deshacerHistorial,
  puedeDeshacer,
  registrarEnHistorial,
} from "../deshacer";

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

describe("historial de deshacer", () => {
  it("guarda la última acción y la devuelve al deshacer", () => {
    const anterior = tarea({ titulo: "Antes" });
    const historial = registrarEnHistorial(HISTORIAL_VACIO, anterior);

    expect(puedeDeshacer(historial)).toBe(true);
    const resultado = deshacerHistorial(historial);
    expect(resultado.tarea).toEqual(anterior);
    expect(puedeDeshacer(resultado.historial)).toBe(false);
  });

  it("reemplaza la acción anterior al registrar una nueva", () => {
    const primera = tarea({ titulo: "Primera" });
    const segunda = tarea({ titulo: "Segunda" });
    const historial = registrarEnHistorial(registrarEnHistorial(HISTORIAL_VACIO, primera), segunda);

    expect(deshacerHistorial(historial).tarea?.titulo).toBe("Segunda");
  });

  it("no permite deshacer con el historial vacío", () => {
    expect(puedeDeshacer(HISTORIAL_VACIO)).toBe(false);
    expect(deshacerHistorial(HISTORIAL_VACIO).tarea).toBeNull();
  });

  it("permite limpiar el historial explícitamente", () => {
    const historial = registrarEnHistorial(HISTORIAL_VACIO, tarea());

    expect(puedeDeshacer({ anterior: null })).toBe(false);
    expect(historial.anterior).not.toBeNull();
  });
});
