export type DecisionConflicto = "aplicar" | "conservar" | "ignorar";

export type LocalConflicto = {
  updated_at: string | null;
  pending: boolean;
};

export type RemotoConflicto = {
  updated_at: string;
  borrado: boolean;
};

function instante(texto: string | null): number | null {
  if (texto === null) return null;
  const valor = Date.parse(texto);
  return Number.isFinite(valor) ? valor : null;
}

/**
 * Última escritura gana comparando instantes, no texto. El remoto inválido no
 * pisa datos locales; un local inválido se reemplaza por el remoto.
 */
export function decidirConflicto(
  local: LocalConflicto,
  remoto: RemotoConflicto,
): DecisionConflicto {
  const fechaRemota = instante(remoto.updated_at);
  if (fechaRemota === null) {
    return "conservar";
  }

  const fechaLocal = instante(local.updated_at);
  if (fechaLocal === null || fechaRemota > fechaLocal) {
    return "aplicar";
  }

  if (fechaRemota < fechaLocal) {
    return "conservar";
  }

  if (remoto.borrado) {
    return "aplicar";
  }

  return local.pending ? "conservar" : "ignorar";
}
