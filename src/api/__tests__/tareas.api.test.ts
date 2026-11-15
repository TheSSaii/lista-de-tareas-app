import { describe, expect, it, jest } from "@jest/globals";

import { ErrorRespuesta } from "../errores";
import { crearApiTareas } from "../tareas.api";
import type { Solicitar } from "../cliente";
import type { TareaParaApi } from "../../services/tipos-sincronizacion";

const REMOTO = {
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

const PAYLOAD: TareaParaApi = {
  titulo: "Tarea",
  descripcion: null,
  prioridad: 2,
  vence_en: null,
  completada: false,
};

type SolicitarFalso = (ruta: string, opciones?: unknown) => Promise<unknown>;

function crearSolicitarFalso() {
  const mock = jest.fn<SolicitarFalso>();
  return { mock, solicitar: mock as unknown as Solicitar };
}

describe("crearApiTareas: listar", () => {
  it("lista con since codificado y valida la respuesta", async () => {
    const { mock, solicitar } = crearSolicitarFalso();
    mock.mockResolvedValue({
      items: [REMOTO],
      servidor_ahora: "2026-11-15T11:00:00.000Z",
    });

    const resultado = await crearApiTareas(solicitar).listar("2026-11-15T10:00:00.000Z");

    expect(mock).toHaveBeenCalledWith("/api/tareas?since=2026-11-15T10%3A00%3A00.000Z", undefined);
    expect(resultado.items[0]?.id).toBe("uuid-1");
  });

  it("lista sin since cuando el cursor es null", async () => {
    const { mock, solicitar } = crearSolicitarFalso();
    mock.mockResolvedValue({ items: [], servidor_ahora: "2026-11-15T11:00:00.000Z" });

    await crearApiTareas(solicitar).listar(null);

    expect(mock).toHaveBeenCalledWith("/api/tareas", undefined);
  });

  it("rechaza una página con forma inválida", async () => {
    const { mock, solicitar } = crearSolicitarFalso();
    mock.mockResolvedValue({ items: "no-es-array" });

    await expect(crearApiTareas(solicitar).listar(null)).rejects.toBeInstanceOf(ErrorRespuesta);
  });

  it("rechaza una página con un item inválido", async () => {
    const { mock, solicitar } = crearSolicitarFalso();
    mock.mockResolvedValue({
      items: [{ ...REMOTO, prioridad: 9 }],
      servidor_ahora: "2026-11-15T11:00:00.000Z",
    });

    await expect(crearApiTareas(solicitar).listar(null)).rejects.toBeInstanceOf(ErrorRespuesta);
  });
});

describe("crearApiTareas: escritura", () => {
  it("guarda con PUT y no envía notificacion_id", async () => {
    const { mock, solicitar } = crearSolicitarFalso();
    mock.mockResolvedValue(REMOTO);

    await crearApiTareas(solicitar).guardar("uuid-1", PAYLOAD);

    expect(mock).toHaveBeenCalledWith("/api/tareas/uuid-1", {
      metodo: "PUT",
      cuerpo: PAYLOAD,
    });
    expect(JSON.stringify(mock.mock.calls[0]?.[1])).not.toContain("notificacion_id");
  });

  it("elimina con DELETE", async () => {
    const { mock, solicitar } = crearSolicitarFalso();
    mock.mockResolvedValue({ ok: true });

    await crearApiTareas(solicitar).eliminar("uuid-1");

    expect(mock).toHaveBeenCalledWith("/api/tareas/uuid-1", { metodo: "DELETE" });
  });

  it("rechaza un documento inválido devuelto por PUT", async () => {
    const { mock, solicitar } = crearSolicitarFalso();
    mock.mockResolvedValue({ id: "uuid-1" });

    await expect(crearApiTareas(solicitar).guardar("uuid-1", PAYLOAD)).rejects.toBeInstanceOf(
      ErrorRespuesta,
    );
  });
});
