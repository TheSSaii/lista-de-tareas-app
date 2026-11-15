import { aFecha } from "./tarea";

export const MINUTOS_AVISO = 30;
export const MS_POR_MINUTO = 60_000;

const PATRON_SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const HORA_RECORDATORIO_SIN_HORA = 9;

export type MotivoSinDisparo = "sin-fecha" | "fecha-invalida" | "vencida";

export type Disparo =
  | { tipo: "programado"; fecha: Date }
  | { tipo: "inmediato"; fecha: Date }
  | { tipo: "ninguno"; motivo: MotivoSinDisparo };

const FORMATO_VENCIMIENTO = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Una fecha sin hora representa un día completo. Para el recordatorio se usa
 * 09:00 local, no la medianoche de `aFecha`, para no avisar la noche anterior.
 */
function fechaDeVencimiento(venceEn: string): Date | null {
  const fecha = aFecha(venceEn);
  if (fecha === null) {
    return null;
  }

  if (PATRON_SOLO_FECHA.test(venceEn)) {
    fecha.setHours(HORA_RECORDATORIO_SIN_HORA, 0, 0, 0);
  }

  return fecha;
}

export function calcularDisparo(venceEn: string | null, ahora: Date): Disparo {
  if (venceEn === null) {
    return { tipo: "ninguno", motivo: "sin-fecha" };
  }

  const vence = fechaDeVencimiento(venceEn);
  if (vence === null) {
    return { tipo: "ninguno", motivo: "fecha-invalida" };
  }

  if (vence.getTime() <= ahora.getTime()) {
    return { tipo: "ninguno", motivo: "vencida" };
  }

  const fechaAviso = new Date(vence.getTime() - MINUTOS_AVISO * MS_POR_MINUTO);
  if (fechaAviso.getTime() > ahora.getTime()) {
    return { tipo: "programado", fecha: fechaAviso };
  }

  return { tipo: "inmediato", fecha: new Date(ahora.getTime() + 1000) };
}

export function mensajeRecordatorio(venceEn: string): string {
  const vence = fechaDeVencimiento(venceEn);
  if (vence === null) {
    return "La fecha de vencimiento no es válida.";
  }

  return `Vence el ${FORMATO_VENCIMIENTO.format(vence)}.`;
}
