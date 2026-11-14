import { useSyncExternalStore } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

const suscribir = () => () => {};

/**
 * En web el valor se recalcula en el cliente para evitar desajustes de hidratación.
 * `useSyncExternalStore` da un valor distinto en servidor y cliente sin setState en un efecto.
 */
export function useColorScheme() {
  const hidratado = useSyncExternalStore(
    suscribir,
    () => true,
    () => false,
  );

  const colorScheme = useRNColorScheme();

  return hidratado ? colorScheme : "light";
}
