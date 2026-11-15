import { useEffect, useRef, useState, type RefObject } from "react";
import { Accelerometer } from "expo-sensors";

import { esSacudida } from "../services/sacudida";
import type { MedicionAceleracion } from "../services/sacudida";

export type EstadoSacudida =
  "inactiva" | "comprobando" | "activa" | "no-disponible" | "sin-permiso";

type Suscripcion = ReturnType<typeof Accelerometer.addListener>;
type GuardarEstado = (estado: EstadoSacudida) => void;
type Control = { cancelado: boolean; suscripcion: Suscripcion | null };

async function activarSensor(
  control: Control,
  setEstado: GuardarEstado,
  alSacudirRef: RefObject<() => void>,
  ultimaRef: RefObject<number | null>,
): Promise<void> {
  setEstado("comprobando");

  try {
    const disponible = await Accelerometer.isAvailableAsync();
    if (control.cancelado) return;
    if (!disponible) {
      setEstado("no-disponible");
      return;
    }

    const permisoInicial = await Accelerometer.getPermissionsAsync();
    const permiso = permisoInicial.granted
      ? permisoInicial
      : await Accelerometer.requestPermissionsAsync();
    if (control.cancelado) return;
    if (!permiso.granted) {
      setEstado("sin-permiso");
      return;
    }

    Accelerometer.setUpdateInterval(100);
    control.suscripcion = Accelerometer.addListener((medicion: MedicionAceleracion) => {
      const ahora = Date.now();
      if (!esSacudida(medicion, ultimaRef.current, ahora)) {
        return;
      }
      ultimaRef.current = ahora;
      alSacudirRef.current();
    });
    setEstado("activa");
  } catch {
    if (!control.cancelado) setEstado("no-disponible");
  }
}

function useSensorActivo(
  activo: boolean,
  setEstado: GuardarEstado,
  alSacudirRef: RefObject<() => void>,
  ultimaRef: RefObject<number | null>,
): void {
  useEffect(() => {
    if (!activo) {
      ultimaRef.current = null;
      return;
    }

    const control: Control = { cancelado: false, suscripcion: null };
    void activarSensor(control, setEstado, alSacudirRef, ultimaRef);

    return () => {
      control.cancelado = true;
      control.suscripcion?.remove();
    };
  }, [activo, alSacudirRef, setEstado, ultimaRef]);
}

export function useSacudida(activo: boolean, onSacudir: () => void): { estado: EstadoSacudida } {
  const [estado, setEstado] = useState<EstadoSacudida>("inactiva");
  const alSacudirRef = useRef(onSacudir);
  const ultimaRef = useRef<number | null>(null);

  useEffect(() => {
    alSacudirRef.current = onSacudir;
  }, [onSacudir]);

  useSensorActivo(activo, setEstado, alSacudirRef, ultimaRef);

  return { estado: activo ? estado : "inactiva" };
}
