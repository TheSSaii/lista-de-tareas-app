import type { ReactNode } from "react";

import { EstadoError } from "./estado-error";
import { ThemedText } from "./themed-text";

type Props = {
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
  children: ReactNode;
};

export function CuerpoTareas({ cargando, error, onReintentar, children }: Props) {
  if (cargando) {
    return <ThemedText themeColor="textSecondary">Cargando…</ThemedText>;
  }

  if (error !== null) {
    return <EstadoError mensaje={error} onReintentar={onReintentar} />;
  }

  return <>{children}</>;
}
