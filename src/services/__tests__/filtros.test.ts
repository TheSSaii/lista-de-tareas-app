import { describe, expect, it } from "@jest/globals";

import type { Tarea } from "../tarea";
import { agruparPorDia, filtrarTareas, type GrupoDia } from "../filtros";

const AHORA = new Date(2026, 10, 14, 12, 0, 0);

function tarea(cambios: Partial<Tarea> = {}): Tarea {
  return {
    id: 1,
    titulo: "Tarea",
    descripcion: null,
    prioridad: 2,
    vence_en: null,
    completada: false,
    notificacion_id: null,
    ...cambios,
  };
}

const vencida = tarea({ id: 1, titulo: "vencida", vence_en: "2026-11-10" });
const hoy = tarea({ id: 2, titulo: "hoy", vence_en: "2026-11-14" });
const manana = tarea({ id: 3, titulo: "mañana", vence_en: "2026-11-15" });
const enSeisDias = tarea({ id: 4, titulo: "en seis días", vence_en: "2026-11-20" });
const enSieteDias = tarea({ id: 5, titulo: "en siete días", vence_en: "2026-11-21" });
const sinFecha = tarea({ id: 6, titulo: "sin fecha" });
const invalida = tarea({ id: 7, titulo: "inválida", vence_en: "2026-02-30" });

const TODAS = [vencida, hoy, manana, enSeisDias, enSieteDias, sinFecha, invalida];

function ids(tareas: readonly Tarea[]): number[] {
  return tareas.map((item) => item.id);
}

function etiquetas(grupos: readonly GrupoDia[]): string[] {
  return grupos.map((grupo) => grupo.etiqueta);
}

describe("filtrarTareas", () => {
  it("hoy incluye vencidas y las que vencen hoy", () => {
    expect(ids(filtrarTareas(TODAS, "hoy", AHORA))).toEqual([1, 2]);
  });

  it("semana incluye vencidas, hoy y los seis días siguientes", () => {
    expect(ids(filtrarTareas(TODAS, "semana", AHORA))).toEqual([1, 2, 3, 4]);
  });

  it("todas no filtra y conserva el orden", () => {
    expect(ids(filtrarTareas(TODAS, "todas", AHORA))).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe("agruparPorDia", () => {
  it("agrupa por etiqueta y conserva el orden recibido dentro de cada grupo", () => {
    const grupos = agruparPorDia(
      [
        hoy,
        vencida,
        tarea({ id: 10, vence_en: "2026-11-18" }),
        manana,
        tarea({ id: 11, vence_en: "2026-11-18" }),
        tarea({ id: 12, vence_en: "2026-11-12" }),
      ],
      AHORA,
    );

    expect(etiquetas(grupos)).toEqual(["Vencidas", "Hoy", "Mañana", "mié 18 nov"]);
    expect(grupos.map((grupo) => ids(grupo.tareas))).toEqual([[1, 12], [2], [3], [10, 11]]);
  });

  it("omite grupos vacíos y deja las fechas nulas o inválidas al final", () => {
    const grupos = agruparPorDia(
      [sinFecha, tarea({ id: 20, vence_en: "2026-11-18" }), invalida],
      AHORA,
    );

    expect(etiquetas(grupos)).toEqual(["mié 18 nov", "Sin fecha"]);
    expect(ids(grupos[0]?.tareas ?? [])).toEqual([20]);
    expect(ids(grupos[1]?.tareas ?? [])).toEqual([6, 7]);
  });
});
