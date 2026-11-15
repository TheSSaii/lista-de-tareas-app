import { describe, expect, it } from "@jest/globals";

import { decidirConflicto } from "../conflictos";

describe("decidirConflicto", () => {
  const local = { updated_at: "2026-11-15T10:00:00.000Z", pending: false };

  it("aplica un remoto más nuevo", () => {
    expect(
      decidirConflicto(local, { updated_at: "2026-11-15T11:00:00.000Z", borrado: false }),
    ).toBe("aplicar");
  });

  it("conserva un local más nuevo y reintenta subirlo", () => {
    expect(
      decidirConflicto(
        { ...local, pending: true },
        { updated_at: "2026-11-15T09:00:00.000Z", borrado: false },
      ),
    ).toBe("conservar");
  });

  it("en empate conserva el local pendiente y no toca el no pendiente", () => {
    expect(
      decidirConflicto(
        { ...local, pending: true },
        { updated_at: local.updated_at, borrado: false },
      ),
    ).toBe("conservar");
    expect(decidirConflicto(local, { updated_at: local.updated_at, borrado: false })).toBe(
      "ignorar",
    );
  });

  it("en empate una tumba remota gana para no resucitar la tarea", () => {
    expect(decidirConflicto(local, { updated_at: local.updated_at, borrado: true })).toBe(
      "aplicar",
    );
  });

  it("trata fechas inválidas sin aplicar silenciosamente", () => {
    expect(
      decidirConflicto(
        { ...local, updated_at: "no-fecha" },
        { updated_at: local.updated_at, borrado: false },
      ),
    ).toBe("aplicar");
    expect(decidirConflicto(local, { updated_at: "no-fecha", borrado: false })).toBe("conservar");
  });
});
