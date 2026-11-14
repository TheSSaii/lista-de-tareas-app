# Configuración de IA — riesgo, barreras y límites

Herramienta: **OpenCode V2**. La hoja del curso usa ejemplos de Claude Code; aquí se
documenta la equivalencia y se demuestra que se cumplen las mismas pruebas.

## Equivalencias

| Hoja del curso (Claude Code) | OpenCode V2 |
|---|---|
| `.claude/settings.json` | `opencode.jsonc` |
| `CLAUDE.md` + `@AGENTS.md` | `AGENTS.md` |
| `permissions.deny: Read(**/.env*)` | `permissions` con `action: "read"` |
| `blockReadsOutsideWorkingDirectories` | `external_directory: deny` |
| `sandbox.network.allowedDomains` | allowlist de `webfetch` + deny de curl/wget/nc/ssh |
| Hook `PreToolUse` | plugin con `permission.hook("evaluate")` y `tool.hook("execute.before")` |
| `Edit(./.claude/**)` denegado | `edit` denegado en `.opencode/**`, `opencode.jsonc`, `AGENTS.md` |

## Barreras

| # | Barrera | Riesgo que cubre | Configuración | Límite conocido |
|---|---|---|---|---|
| 1 | Reglas del proyecto | La IA no conoce stack ni prohibiciones | `AGENTS.md` | Orienta, no protege |
| 2 | Permisos de lectura/escritura | Fuga de `.env*`, `.pem`, `.key`, keystores | `permissions[read]` y `[edit]` | No cubre procesos ya lanzados |
| 3 | Cárcel de directorios | Leer o escribir fuera del repo | `external_directory`, `../*`, `glob` | Aplica a herramientas, no a un proceso |
| 4 | Shell | `sudo`, `rm -rf`, `curl`, `wget`, push forzado; commits y push piden permiso | `permissions[shell]` + hook | No analiza el interior de un script |
| 5 | Red | Exfiltración o descargas | allowlist `webfetch` + hook | No es un firewall del sistema |
| 6 | Hook propio | Comandos que evaden las reglas, incluidas escrituras de Git encadenadas | `.opencode/plugins/guard/` | Heurística de texto, no sandbox |
| 7 | Sin secretos reales | Aunque algo falle, no hay nada que robar | Solo Vercel / Emulador | Depende de la disciplina del equipo |
| 8 | Auditoría | Saber qué ejecutó la IA | `ia/logs/acciones-ia.log` | Registra, no previene |

## Orden de evaluación (regla #4)

OpenCode evalúa las reglas **en orden y gana la última que coincide**. Para lograr la
precedencia `deny → ask → allow` de la hoja, el archivo está escrito así:

1. `shell * → ask` (todo pide permiso).
2. `allow` de inspección (`git status`, `git diff`, `npm run check`…).
3. `ask` de acciones con efecto (`git commit`/`push`, también encadenadas; instalar
   dependencias, `vercel`, `eas`).
4. **`deny` al final**.

Como no existe ninguna regla `allow` después de los `deny`, ningún permiso puede abrir una
excepción dentro de un bloqueo. El único `allow` que hubo dentro de un `deny`
(`.env.example`) se eliminó: el archivo se versiona para humanos y la IA tampoco lo lee.

El hook también devuelve `ask` para `git add`, `commit`, `push`, `merge`, `rebase`,
`reset`, `checkout`, `switch` y `restore`, aunque vengan dentro de un comando compuesto
tras una instrucción permitida. La evaluación es por segmentos (`&&`, `||`, `;`, `|`) y el
filtro de `.env` se aplica al comando completo antes de segmentar, así que `cat ".env"`
tampoco evade la regla. También piden permiso la instalación de dependencias (`npm install`,
`npx expo install`), el despliegue (`vercel`, `eas`, `firebase deploy`) y `npx expo start`.
`git push --force`, `git reset --hard` y `git clean -f` siguen en `deny` y se evalúan primero.

## Dominios permitidos y su justificación

| Dominio | Para qué | Por qué es mínimo e indispensable |
|---|---|---|
| `registry.npmjs.org` | Metadatos de paquetes | verificar dependencias antes de instalar (regla del punto 5) |
| `www.npmjs.com` | Ficha y mantenimiento de paquetes | comprobar que un paquete existe y está mantenido |
| `github.com` | Repos y releases de librerías | fuente original del código que se usa |
| `raw.githubusercontent.com` | Archivos sin procesar | leer documentación o ejemplos del repo oficial |
| `docs.expo.dev` | Documentación de Expo | stack de la app |
| `reactnative.dev` | Documentación de React Native | stack de la app |
| `opencode.ai` | Documentación de OpenCode | validar la sintaxis de esta misma configuración |
| `developer.mozilla.org` | Referencia JS y APIs web | `fetch`, `AbortController`, fechas |
| `firebase.google.com` | Auth, Firestore, Admin SDK | backend del proyecto |
| `cloud.google.com` | Cuentas de servicio y gRPC | Firebase Admin se apoya en Google Cloud |
| `nextjs.org` | App Router y Route Handlers | stack de la API |
| `vitest.dev` | Configuración y cobertura | pruebas de la API |
| `eslint.org` | Reglas de lint | calidad automática |
| `prettier.io` | Opciones de formato | calidad automática |
| `zod.dev` | Esquemas de validación | validación de la API |

`websearch` queda en `allow` porque las búsquedas no llevan secretos y `AGENTS.md`
prohíbe escribirlos en prompts. No hay servidores MCP configurados.

## Límites que se declaran en la sustentación

- **OpenCode V2 no tiene sandbox de sistema de archivos ni de red.** El shell corre con
  los permisos del usuario. No se finge un aislamiento que la herramienta no ofrece: se
  compensa con permisos + hook + ningún secreto real en disco + aprobación humana.
- **No se usa WSL.** El desarrollo es macOS; no aplica el paso de Windows/WSL2 con
  `bubblewrap` y `socat`. No se instala nada de eso.
- **Un proceso ya lanzado** (`npm`, `jest`, `next`) puede tocar lo que el usuario puede
  tocar. Por eso `FIREBASE_PRIVATE_KEY` y `FIREBASE_WEB_API_KEY` viven solo en Vercel.
- **El hook es heurístico:** reconoce formas de comando, no la intención. Un comando
  ofuscado puede no coincidir; la barrera que queda es que el secreto no esté en disco.
- **Las reglas de shell** no leen el contenido de un script; solo el texto del comando.

## Sin secretos reales en el disco

- `FIREBASE_PRIVATE_KEY` y `FIREBASE_WEB_API_KEY`: únicamente en Vercel.
- En local se usa el **Emulador** (Auth + Firestore) con un proyecto de desarrollo.
- `vercel env pull` está denegado en tres capas: permisos, hook y `AGENTS.md`.
- `.env` y `.env.local` no se crean con valores reales en este equipo.
- Ni la app ni el APK contienen `firebaseConfig`.