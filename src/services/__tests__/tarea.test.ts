import { describe, expect, it } from "@jest/globals";

import {
  estaVencida,
  ordenarTareas,
  sumarUnDia,
  type Tarea,
  validarTarea,
  type EntradaValidable,
} from "../tarea";

const AHORA = new Date(2026, 10, 14, 12, 0, 0);

function crearTarea(cambios: Partial<Tarea> = {}): Tarea {
  return {
    id: 1,
    titulo: "Comprar pan",
    descripcion: null,
    prioridad: 2,
    vence_en: null,
    completada: false,
    notificacion_id: null,
    ...cambios,
  };
}

function entrada(cambios: Partial<EntradaValidable> = {}): EntradaValidable {
  return { titulo: "Tarea válida", prioridad: 2, vence_en: null, ...cambios };
}

function errorDeFecha(vence_en: string | null): string | undefined {
  return validarTarea(entrada({ vence_en }), AHORA).vence_en;
}

function titulos(tareas: readonly Tarea[]): string[] {
  return tareas.map((tarea) => tarea.titulo);
}

describe("validarTarea: título", () => {
  it("acepta longitudes límite de 3 y 100", () => {
    for (const titulo of ["a".repeat(3), "a".repeat(100)]) {
      expect(validarTarea(entrada({ titulo }), AHORA).titulo).toBeUndefined();
    }
  });

  it("rechaza longitudes de 2 y 101", () => {
    for (const titulo of ["a".repeat(2), "a".repeat(101)]) {
      expect(validarTarea(entrada({ titulo }), AHORA).titulo).toBeDefined();
    }
  });

  it("rechaza vacío o solo espacios", () => {
    for (const titulo of ["", "   "]) {
      expect(validarTarea(entrada({ titulo }), AHORA).titulo).toBeDefined();
    }
  });

  it("recorta espacios antes de medir (C2-18)", () => {
    expect(validarTarea(entrada({ titulo: "  abc  " }), AHORA).titulo).toBeUndefined();
    expect(validarTarea(entrada({ titulo: "  ab  " }), AHORA).titulo).toBeDefined();
  });
});

describe("validarTarea: prioridad", () => {
  it("acepta 1, 2 y 3", () => {
    for (const prioridad of [1, 2, 3]) {
      expect(validarTarea(entrada({ prioridad }), AHORA).prioridad).toBeUndefined();
    }
  });

  it("rechaza valores fuera de 1–3, decimales o no numéricos", () => {
    for (const prioridad of [0, 4, 1.5, Number.NaN]) {
      expect(validarTarea(entrada({ prioridad }), AHORA).prioridad).toBeDefined();
    }
  });
});

describe("validarTarea: fecha de vencimiento", () => {
  it("acepta null", () => {
    expect(errorDeFecha(null)).toBeUndefined();
  });

  it("acepta hoy y rechaza ayer en formato YYYY-MM-DD (C2-16)", () => {
    expect(errorDeFecha("2026-11-14")).toBeUndefined();
    expect(errorDeFecha("2026-11-13")).toBeDefined();
  });

  it("rechaza texto no ISO y fechas de calendario imposibles", () => {
    expect(errorDeFecha("mañana")).toBeDefined();
    expect(errorDeFecha("2026-02-30")).toBeDefined();
  });

  it("devuelve todos los errores por campo a la vez", () => {
    const errores = validarTarea({ titulo: "ab", prioridad: 9, vence_en: "2026-11-13" }, AHORA);
    expect(errores).toEqual({
      titulo: expect.any(String),
      prioridad: expect.any(String),
      vence_en: expect.any(String),
    });
  });

  it("devuelve un objeto vacío cuando la entrada es válida", () => {
    expect(validarTarea(entrada(), AHORA)).toEqual({});
  });
});

describe("ordenarTareas: prioridad", () => {
  it("ordena de prioridad 1 (alta) a 3 (baja)", () => {
    const tareas = [
      crearTarea({ id: 1, titulo: "baja", prioridad: 3 }),
      crearTarea({ id: 2, titulo: "alta", prioridad: 1 }),
      crearTarea({ id: 3, titulo: "media", prioridad: 2 }),
    ];
    expect(titulos(ordenarTareas(tareas, AHORA))).toEqual(["alta", "media", "baja"]);
  });

  it("desempata por id cuando prioridad y fecha coinciden", () => {
    const tareas = [
      crearTarea({ id: 2, titulo: "segunda", vence_en: "2026-11-20" }),
      crearTarea({ id: 1, titulo: "primera", vence_en: "2026-11-20" }),
    ];
    expect(titulos(ordenarTareas(tareas, AHORA))).toEqual(["primera", "segunda"]);
  });

  it("la prioridad manda sobre la fecha dentro del mismo grupo", () => {
    const tareas = [
      crearTarea({ id: 1, titulo: "baja-pronto", prioridad: 3, vence_en: "2026-11-15" }),
      crearTarea({ id: 2, titulo: "alta-tarde", prioridad: 1, vence_en: "2026-12-30" }),
    ];
    expect(titulos(ordenarTareas(tareas, AHORA))).toEqual(["alta-tarde", "baja-pronto"]);
  });
});

describe("ordenarTareas: fecha y vencimiento", () => {
  it("pone las vencidas primero aunque tengan peor prioridad", () => {
    const tareas = [
      crearTarea({ id: 1, titulo: "futura", prioridad: 1, vence_en: "2026-12-01" }),
      crearTarea({ id: 2, titulo: "vencida", prioridad: 3, vence_en: "2026-11-10" }),
    ];
    expect(titulos(ordenarTareas(tareas, AHORA))).toEqual(["vencida", "futura"]);
  });
});

describe("ordenarTareas: fechas y estabilidad", () => {
  it("ordena por vence_en ascendente y deja null al final", () => {
    const tareas = [
      crearTarea({ id: 1, titulo: "sin-fecha", vence_en: null }),
      crearTarea({ id: 2, titulo: "pronto", vence_en: "2026-11-18" }),
      crearTarea({ id: 3, titulo: "despues", vence_en: "2026-11-20" }),
    ];
    expect(titulos(ordenarTareas(tareas, AHORA))).toEqual(["pronto", "despues", "sin-fecha"]);
  });

  it("ordena cronológicamente con formatos YYYY-MM-DD e ISO mezclados (C2-17)", () => {
    const tareas = [
      crearTarea({ id: 1, titulo: "diciembre", vence_en: "2026-12-01" }),
      crearTarea({ id: 2, titulo: "noviembre-iso", vence_en: "2026-11-20T15:00:00.000Z" }),
      crearTarea({ id: 3, titulo: "noviembre", vence_en: "2026-11-25" }),
    ];
    expect(titulos(ordenarTareas(tareas, AHORA))).toEqual([
      "noviembre-iso",
      "noviembre",
      "diciembre",
    ]);
  });

  it("coloca las fechas inválidas después de las válidas y antes de null", () => {
    const tareas = [
      crearTarea({ id: 1, titulo: "nula", vence_en: null }),
      crearTarea({ id: 2, titulo: "invalida", vence_en: "2026-02-30" }),
      crearTarea({ id: 3, titulo: "valida", vence_en: "2026-11-20" }),
    ];
    expect(titulos(ordenarTareas(tareas, AHORA))).toEqual(["valida", "invalida", "nula"]);
  });

  it("no muta el arreglo original", () => {
    const original = [
      crearTarea({ id: 1, titulo: "b", prioridad: 3 }),
      crearTarea({ id: 2, titulo: "a", prioridad: 1 }),
    ];
    const copia = original.map((tarea) => ({ ...tarea }));
    const ordenadas = ordenarTareas(original, AHORA);
    expect(original).toEqual(copia);
    expect(ordenadas).not.toBe(original);
  });

  it("usa el ahora inyectado para decidir qué está vencido (C2-15)", () => {
    const tarea = crearTarea({ vence_en: "2026-11-15" });
    expect(estaVencida(tarea, new Date(2026, 10, 15, 12))).toBe(false);
    expect(estaVencida(tarea, new Date(2026, 10, 20, 12))).toBe(true);
  });
});

describe("sumarUnDia", () => {
  it("avanza un día conservando el formato solo-fecha", () => {
    expect(sumarUnDia("2026-11-30")).toBe("2026-12-01");
  });

  it("avanza un día conservando el ISO", () => {
    expect(sumarUnDia("2026-11-30T10:00:00.000Z")).toBe("2026-12-01T10:00:00.000Z");
  });

  it("lanza un error con una fecha inválida", () => {
    expect(() => sumarUnDia("2026-02-30")).toThrow(Error);
    expect(() => sumarUnDia("no-es-fecha")).toThrow(Error);
  });
});

describe("estaVencida", () => {
  it("trata null y fechas inválidas como no vencidas", () => {
    expect(estaVencida(crearTarea({ vence_en: null }), AHORA)).toBe(false);
    expect(estaVencida(crearTarea({ vence_en: "2026-02-30" }), AHORA)).toBe(false);
  });

  it("no marca vencida una tarea de hoy con hora ya pasada (C2-19)", () => {
    expect(estaVencida(crearTarea({ vence_en: "2026-11-14T01:00:00" }), AHORA)).toBe(false);
  });

  it("solo depende de la fecha, no de completada (regla temporal)", () => {
    const tarea = crearTarea({ vence_en: "2026-11-13", completada: true });
    expect(estaVencida(tarea, AHORA)).toBe(true);
  });
});
