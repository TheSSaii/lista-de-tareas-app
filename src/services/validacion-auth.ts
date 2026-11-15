export type ValoresAuth = {
  email: string;
  password: string;
};

export type ErroresAuth = Partial<Record<keyof ValoresAuth, string>>;

const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MINIMA = 8;

export function validarAuth(valores: ValoresAuth): ErroresAuth {
  const errores: ErroresAuth = {};
  const email = valores.email.trim();

  if (!PATRON_EMAIL.test(email)) {
    errores.email = "Escribe un correo válido.";
  }
  if (valores.password.length < PASSWORD_MINIMA) {
    errores.password = "La contraseña debe tener al menos 8 caracteres.";
  }

  return errores;
}
