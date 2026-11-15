import { describe, expect, it } from "@jest/globals";

import { aPayloadApi, esTareaRemota } from "../mapeo-tareas";
import type { TareaPendiente } from "../tipos-sincronizacion";

const PENDIENTE: TareaPendiente = {
  id: 1,
  titulo: "Entregar informe",
  descripcion: "Con anexos",
  prioridad: 1,
  vence_en: "2026-11-20T10:00:00.000Z",
  completada: false,
  notificacion_id: "notif-local",
  remote_id: "uuid-1",
  updated_at: "2026-11-15T10:00:00.000Z",
  deleted: false,
  pending: true,
};

describe("aPayloadApi", () => {
  it("envía solo los campos del contrato y nunca notificacion_id", () => {
    const payload = aPayloadApi(PENDIENTE);

    expect(payload).toEqual({
      titulo: "Entregar informe",
      descripcion: "Con anexos",
      prioridad: 1,
      vence_en: "2026-11-20T10:00:00.000Z",
      completada: false,
    });
    expect(JSON.stringify(payload)).not.toContain("notificacion_id");
    expect(JSON.stringify(payload)).not.toContain("remote_id");
  });
});

describe("esTareaRemota", () => {
  it("acepta una tarea del contrato y rechaza prioridad o tipos inválidos", () => {
    const valida = {
      id: "uuid-1",
      titulo: "Tarea",
      descripcion: null,
      prioridad: 2,
      vence_en: null,
      completada: false,
      created_at: "2026-11-15T10:00:00.000Z",
      updated_at: "2026-11-15T10:00:00.000Z",
      deleted_at: null,
    };

    expect(esTareaRemota(valida)).toBe(true);
    expect(esTareaRemota({ ...valida, prioridad: 9 })).toBe(false);
    expect(esTareaRemota({ ...valida, updated_at: null })).toBe(false);
  });
});
