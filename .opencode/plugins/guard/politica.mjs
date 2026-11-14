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

// Escrituras del historial: no se deniegan, se piden con aprobación humana.
export const PEDIR_PERMISO = [
  {
    id: "git-escritura",
    patron: /\bgit\s+(add|commit|push|tag|merge|rebase|cherry-pick|revert|stash|reset|checkout|switch|restore)\b/,
    motivo: "Los cambios en el historial o el árbol de Git requieren aprobación humana.",
  },
  {
    id: "dependencias",
    patron:
      /\b(npm\s+(install|i|ci|add)\b|npx\s+expo\s+install\b|npx\s+create-expo-app\b|yarn\s+add\b|pnpm\s+add\b)/,
    motivo: "Instalar dependencias requiere aprobación humana.",
  },
  {
    id: "despliegue",
    patron: /\b(vercel|eas)\b|\bfirebase\s+deploy\b/,
    motivo: "Desplegar tiene efecto fuera de la máquina: requiere aprobación humana.",
  },
  {
    id: "servidor-dev",
    patron: /\bnpx\s+expo\s+start\b/,
    motivo: "Levantar el servidor de desarrollo requiere aprobación humana.",
  },
];

const ENV_EN_COMANDO = /(^|[\s"'=:(/\\])\.env(\.[\w.-]+)?($|[\s"'`),;|&])/i;
const RUTA_ENV = /(^|[/\\])\.env(\.[\w.-]+)?$/i;
const CLAVE = /\.(pem|key|p8|p12|keystore|jks)$/i;
const CUENTA = /(firebase-adminsdk|service-?account|credenciales)/i;

// Un comando encadenado ("git status && git push --force") se evalúa por segmentos: si no,
// el `allow` de la primera parte taparía el `ask` o el `deny` de la segunda.
const SEGMENTO = /(?:[^"'|;&]+|"[^"]*"|'[^']*')+/g;
const SIN_COMILLAS = /"[^"]*"|'[^']*'/g;

function segmentosDe(texto) {
  return (texto.match(SEGMENTO) ?? [])
    .map((segmento) => segmento.replace(SIN_COMILLAS, '""').trim())
    .filter((segmento) => segmento.length > 0);
}

/** Gana lo más restrictivo de todos los segmentos: deny > ask > permitir. */
function evaluarComando(texto) {
  // Se comprueba sobre el texto original: si se quitara la comilla, `cat ".env"` pasaría.
  if (ENV_EN_COMANDO.test(texto)) {
    return niega("secreto", "El comando menciona un archivo .env: bloqueado.");
  }

  let pedir = { efecto: "permitir" };

  for (const segmento of segmentosDe(texto)) {
    for (const regla of BLOQUEOS) {
      if (regla.patron.test(segmento)) return niega(regla.id, regla.motivo);
    }
    if (ENV_EN_COMANDO.test(segmento)) {
      return niega("secreto", "El comando menciona un archivo .env: bloqueado.");
    }
    for (const regla of PEDIR_PERMISO) {
      if (regla.patron.test(segmento)) {
        pedir = { efecto: "ask", regla: regla.id, motivo: regla.motivo };
      }
    }
  }

  return pedir;
}

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
      const veredicto = evaluarComando(texto);
      if (veredicto.efecto !== "permitir") return veredicto;
    }

    if (accion === "webfetch") {
      const permitido = DOMINIOS_PERMITIDOS.some((dominio) => texto.startsWith(`https://${dominio}/`));
      if (!permitido) return niega("red", "Dominio no permitido por la política del proyecto.");
    }
  }

  return { efecto: "permitir" };
}