import { router } from "expo-router";

export function volver(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace("/");
}

export function abrirEdicionTarea(id: number): void {
  router.push({ pathname: "/tarea/[id]", params: { id: String(id) } });
}
