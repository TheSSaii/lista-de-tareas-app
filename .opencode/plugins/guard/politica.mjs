// Política pura y sin dependencias. El plugin la aplica antes de cada herramienta.
// Se prueba con: node --test "ia/pruebas/*.test.mjs"

export const DOMINIOS_PERMITIDOS = [
  "registry.npmjs.org", "www.npmjs.com", "github.com", "raw.githubusercontent.com",
  "docs.expo.dev", "reactnative.dev", "opencode.ai", "developer.mozilla.org",
  "firebase.google.com", "cloud.google.com", "nextjs.org",
  "vitest.dev", "eslint.org", "prettier.io", "zod.dev",
];

export const BLOQUEOS = [
  { id: "red", patron: /(^|[\s;|&(])(curl|wget|nc|ncat|telnet|scp|ssh|ftp)\b/, motivo: "Descargas y conexiones desde la shell están deshabilitadas. Usa webfetch a dominios permitidos." },
  { id: "privilegios", patron: /(^|[\s;|&(])sudo\b/, motivo: "sudo está prohibido: la IA no eleva privilegios." },
  { id: "borrado", patron: /(^|[\s;|&(])rm\s+(-[a-zA-Z]*[rf][a-zA-Z]*\s+)+/, motivo: "Borrado recursivo o forzado prohibido." },
  { id: "historial", patron: /\bgit\s+(push\s+[^;|&]*(--force|-f)\b|reset\s+--hard|clean\s+-[a-zA-Z]*f)/, motivo: "Reescribir el historial está prohibido." },
  { id: "entorno", patron: /(^|[\s;|&(])(env|printenv|set)(\s|$|;|\|)/, motivo: "Volcar variables de entorno está prohibido." },
  { id: "produccion", patron: /\bvercel\s+env\s+pull\b/, motivo: "vercel env pull baja secretos de producción al disco: prohibido." },
  { id: "shell-de-secretos", patron: /(^|[\s;|&(])(cat|head|tail|less|more|strings|xxd|od|base64)\b[^;|&]*\.env/, motivo: "Leer archivos .env desde la shell está prohibido." },
  { id: "grep-recursivo", patron: /(^|[\s;|&(])(grep|rg|ag)\s+(-[a-zA-Z]*[rR]|--recursive)/, motivo: "grep recursivo por shell está prohibido: usa la herramienta grep del agente." },
  { id: "eval", patron: /\b(node|python[0-9.]*|perl|ruby)\s+(-e|-c)\b/, motivo: "Ejecución de código en línea prohibida." },
  { id: "permisos", patron: /\bchmod\s+777\b|\bchown\b/, motivo: "Cambios de permisos o propietario prohibidos." },
];

const ENV_EN_COMANDO = /(^|[\s"'=:(/\\])\.env(\.[\w.-]+)?($|[\s"'`),;|&])/i;
const RUTA_ENV = /(^|[/\\])\.env(\.[\w.-]+)?$/i;
const CLAVE = /\.(pem|key|p8|p12|keystore|jks)$/i;
const CUENTA = /(firebase-adminsdk|service-?account|credenciales)/i;

function niega(regla, motivo) {
  return { efecto: "deny", regla, motivo };
}

function dentroDeLaRaiz(texto, raiz) {
  if (!raiz) return false;
  const limpio = texto.replaceAll("\\", "/");
  const base = raiz.replaceAll("\\", "/").replace(/\/+$/, "");
  return limpio === base || limpio.startsWith(`${base}/`);
}

function fueraDeLaRaiz(texto, raiz) {
  if (texto.startsWith("~") || texto.startsWith("$HOME")) return true;
  if (/^\.\.([/\\]|$)/.test(texto)) return true;
  if (/^[/\\]/.test(texto)) return !dentroDeLaRaiz(texto, raiz);
  return false;
}

export function evaluar(accion, recursos, raiz = "") {
  const lista = Array.isArray(recursos) ? recursos : [recursos];

  for (const recurso of lista) {
    // Se permite explícitamente el ejemplo sin valores reales.
    const texto = String(recurso ?? "");

    if (accion === "read" || accion === "edit") {
      if (RUTA_ENV.test(texto) || CLAVE.test(texto) || CUENTA.test(texto)) {
        return niega("secreto", "La IA no puede leer ni escribir secretos.");
      }
      if (fueraDeLaRaiz(texto, raiz)) {
        return niega("fuera-del-repo", "Ruta fuera del repositorio: bloqueada.");
      }
    }

    if (accion === "shell") {
      for (const regla of BLOQUEOS) {
        if (regla.patron.test(texto)) return niega(regla.id, regla.motivo);
      }
      if (ENV_EN_COMANDO.test(texto)) {
        return niega("secreto", "El comando menciona un archivo .env: bloqueado.");
      }
    }

    if (accion === "webfetch") {
      const permitido = DOMINIOS_PERMITIDOS.some((dominio) => texto.startsWith(`https://${dominio}/`));
      if (!permitido) return niega("red", "Dominio no permitido por la política del proyecto.");
    }
  }

  return { efecto: "permitir" };
}