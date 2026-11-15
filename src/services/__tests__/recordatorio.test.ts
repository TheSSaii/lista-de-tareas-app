import { describe, expect, it } from "@jest/globals";

import { calcularDisparo, mensajeRecordatorio } from "../recordatorio";

const AHORA = new Date(2026, 10, 15, 12, 0, 0);

function fechaLocal(anio: number, mes: number, dia: number, hora: number, minuto: number): Date {
  return new Date(anio, mes - 1, dia, hora, minuto, 0, 0);
}

describe("calcularDisparo", () => {
  it("programa 30 minutos antes de una tarea que vence en una hora", () => {
    const vence = fechaLocal(2026, 11, 15, 13, 0);
    const disparo = calcularDisparo(vence.toISOString(), AHORA);

    expect(disparo.tipo).toBe("programado");
    if (disparo.tipo === "programado") {
      expect(disparo.fecha.getTime()).toBe(fechaLocal(2026, 11, 15, 12, 30).getTime());
    }
  });

  it("programa dentro de un minuto cuando vence en 31 minutos", () => {
    const vence = fechaLocal(2026, 11, 15, 12, 31);
    const disparo = calcularDisparo(vence.toISOString(), AHORA);

    expect(disparo.tipo).toBe("programado");
    if (disparo.tipo === "programado") {
      expect(disparo.fecha.getTime()).toBe(fechaLocal(2026, 11, 15, 12, 1).getTime());
    }
  });
});

describe("calcularDisparo · límites", () => {
  it("trata el límite exacto de 30 minutos como aviso inmediato", () => {
    const vence = fechaLocal(2026, 11, 15, 12, 30);
    const disparo = calcularDisparo(vence.toISOString(), AHORA);

    expect(disparo.tipo).toBe("inmediato");
    if (disparo.tipo === "inmediato") {
      expect(disparo.fecha.getTime()).toBe(AHORA.getTime() + 1000);
    }
  });

  it("avisa de inmediato cuando vence en menos de 30 minutos", () => {
    const vence = fechaLocal(2026, 11, 15, 12, 20);
    const disparo = calcularDisparo(vence.toISOString(), AHORA);

    expect(disparo.tipo).toBe("inmediato");
  });

  it("no programa nada si la tarea ya venció", () => {
    const vence = fechaLocal(2026, 11, 15, 11, 0);
    const disparo = calcularDisparo(vence.toISOString(), AHORA);

    expect(disparo).toEqual({ tipo: "ninguno", motivo: "vencida" });
  });

  it("no programa nada sin fecha o con fecha inválida", () => {
    expect(calcularDisparo(null, AHORA)).toEqual({ tipo: "ninguno", motivo: "sin-fecha" });
    expect(calcularDisparo("2026-02-30", AHORA)).toEqual({
      tipo: "ninguno",
      motivo: "fecha-invalida",
    });
  });

  it("interpreta una fecha sin hora a las 09:00 locales para el recordatorio", () => {
    const disparo = calcularDisparo("2026-11-20", AHORA);

    expect(disparo.tipo).toBe("programado");
    if (disparo.tipo === "programado") {
      expect(disparo.fecha.getTime()).toBe(fechaLocal(2026, 11, 20, 8, 30).getTime());
    }
  });

  it("no programa una fecha sin hora que ya pasó a las 09:00 locales", () => {
    const ahora = fechaLocal(2026, 11, 15, 10, 0);
    const disparo = calcularDisparo("2026-11-15", ahora);

    expect(disparo).toEqual({ tipo: "ninguno", motivo: "vencida" });
  });
});

describe("mensajeRecordatorio", () => {
  it("describe la fecha y la hora de vencimiento", () => {
    const mensaje = mensajeRecordatorio(fechaLocal(2026, 11, 20, 14, 30).toISOString());

    expect(mensaje).toContain("20");
    expect(mensaje).toContain("nov");
    expect(mensaje).toContain("14:30");
  });

  it("describe una fecha sin hora con la hora de recordatorio", () => {
    expect(mensajeRecordatorio("2026-11-20")).toContain("09:00");
  });
});
