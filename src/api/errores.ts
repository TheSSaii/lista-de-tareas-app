export type DetalleError = {
  campo: string;
  mensaje: string;
};

export class ErrorConfig extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorConfig";
  }
}

export class ErrorApi extends Error {
  readonly estado: number;
  readonly detalles: DetalleError[];

  constructor(estado: number, mensaje: string, detalles: DetalleError[] = []) {
    super(mensaje);
    this.name = "ErrorApi";
    this.estado = estado;
    this.detalles = detalles;
  }
}

export class ErrorRed extends Error {
  constructor() {
    super("No se pudo conectar con el servidor.");
    this.name = "ErrorRed";
  }
}

export class ErrorTiempo extends Error {
  constructor() {
    super("El servidor tardó demasiado en responder.");
    this.name = "ErrorTiempo";
  }
}

export class ErrorRespuesta extends Error {
  constructor() {
    super("El servidor devolvió una respuesta inesperada.");
    this.name = "ErrorRespuesta";
  }
}

export class ErrorSesionExpirada extends Error {
  constructor() {
    super("La sesión expiró. Vuelve a iniciar sesión.");
    this.name = "ErrorSesionExpirada";
  }
}

export function esDetalleError(valor: unknown): valor is DetalleError {
  if (typeof valor !== "object" || valor === null) return false;
  const detalle = valor as Record<string, unknown>;
  return typeof detalle.campo === "string" && typeof detalle.mensaje === "string";
}
