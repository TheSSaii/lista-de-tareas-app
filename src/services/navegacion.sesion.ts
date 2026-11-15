export type EstadoSesion = "cargando" | "invitado" | "autenticado";

export function destinoSesion(estado: EstadoSesion, segmentos: readonly string[]): string | null {
  const enAuth = segmentos[0] === "(auth)";

  if (estado === "cargando") return null;
  if (estado === "invitado") return enAuth ? null : "/login";
  return enAuth ? "/" : null;
}
