import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";

import type { SesionGuardada, Usuario } from "../services/tipos-sesion";

const CLAVE_TOKEN = "lista_tareas_token";
const CLAVE_REFRESH = "lista_tareas_refresh";
const CLAVE_USUARIO = "lista_tareas_usuario";
const CLAVE_EXPIRA = "lista_tareas_expira";
const CLAVES = [CLAVE_TOKEN, CLAVE_REFRESH, CLAVE_USUARIO, CLAVE_EXPIRA];

function leerUsuario(texto: string | null): Usuario | null {
  if (texto === null) return null;
  try {
    const valor = JSON.parse(texto) as unknown;
    if (typeof valor !== "object" || valor === null) return null;
    const usuario = valor as Record<string, unknown>;
    if (typeof usuario.id !== "string" || typeof usuario.email !== "string") return null;
    return { id: usuario.id, email: usuario.email };
  } catch {
    return null;
  }
}

export async function guardarSesion(sesion: SesionGuardada): Promise<void> {
  await setItemAsync(CLAVE_TOKEN, sesion.token);
  await setItemAsync(CLAVE_REFRESH, sesion.refreshToken);
  await setItemAsync(CLAVE_USUARIO, JSON.stringify(sesion.usuario));
  await setItemAsync(CLAVE_EXPIRA, String(sesion.expiraEn));
}

export async function borrarSesion(): Promise<void> {
  await Promise.all(CLAVES.map((clave) => deleteItemAsync(clave)));
}

export async function leerSesion(): Promise<SesionGuardada | null> {
  const token = await getItemAsync(CLAVE_TOKEN);
  const refreshToken = await getItemAsync(CLAVE_REFRESH);
  const usuarioTexto = await getItemAsync(CLAVE_USUARIO);
  const expiraTexto = await getItemAsync(CLAVE_EXPIRA);
  const usuario = leerUsuario(usuarioTexto);
  const expiraEn = Number(expiraTexto);

  if (
    token === null ||
    token === "" ||
    refreshToken === null ||
    refreshToken === "" ||
    usuario === null ||
    !Number.isFinite(expiraEn)
  ) {
    await borrarSesion();
    return null;
  }

  return { token, refreshToken, usuario, expiraEn };
}
