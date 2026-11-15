# Bitácora de IA

Formato: propósito · evidencia · validación · decisión.

## 2026-11-14 · Configuración inicial
- **Propósito:** bloquear lectura de secretos y salida del repositorio antes de generar código.
- **Evidencia:** `opencode.jsonc`, `.opencode/plugins/guard/`, `npm run check:ia` (16/16).
- **Validación:** pruebas 1, 2, 4, 8 y 9 de `ia/PRUEBAS-CONTENCION.md`.
- **Decisión:** los `deny` van al final porque OpenCode usa «gana la última regla».
  No existe excepción para `.env.example`: el archivo se versiona, pero la IA no lo lee ni lo escribe.
- **Decisión:** sin WSL ni sandbox de SO; el límite se documenta en `ia/CONFIGURACION.md`.

## 2026-11-14 · Hito 1 · Caso corregido 1 — fechas `YYYY-MM-DD` y zona horaria
- **Propósito:** capa de dominio de tareas (`src/services/tarea.ts`): validación y orden puros, sin Expo ni red.
- **Propuesta de la IA (plan del hito):** comparar `vence_en` contra el inicio del día local con `new Date(vence_en)`.
- **Corregido por el humano:** con el formato `YYYY-MM-DD` (permitido por la sección 9.2)
  `new Date("2026-11-14")` devuelve medianoche **UTC**. En UTC-5 el inicio del día local es
  `2026-11-14T05:00Z`, así que una tarea que vence HOY se marcaba vencida y se resaltaba en rojo (RF-05).
  El plan no lo detectaba porque sus pruebas solo usaban fechas ISO con hora.
- **Evidencia (ejecutado en la máquina, zona -05):**

  ```
  inicio de hoy local    : 2026-11-14T05:00:00.000Z
  new Date("2026-11-14") : 2026-11-14T00:00:00.000Z
  ¿vencida?              : true   ← incorrecto
  ```

- **Corrección aplicada:** `aFecha()` interpreta `YYYY-MM-DD` como medianoche local
  (`new Date(anio, mes-1, dia)`) y rechaza fechas de calendario imposibles (`2026-02-30`);
  las fechas con hora pasan por `new Date(iso)`.
- **Validación:** la prueba del caso «hoy es válida / ayer es error» falla con la implementación
  ingenua y pasa con la corregida; `npm run check` en verde con 23/23 pruebas.

## 2026-11-14 · Hito 1 · Capa de dominio `src/services/tarea.ts`
- **Propósito:** tipo `Tarea`, validación por campo de la sección 7 y orden por
  vencimiento, prioridad y fecha.
- **Evidencia:** `src/services/__tests__/tarea.test.ts` escrito antes del código; la primera
  ejecución falla por `Cannot find module '../tarea'`; después, 23/23 en verde.
- **Validación:** `npm run check` completo (typecheck, ESLint, Prettier y Jest). Cobertura de
  `src/services/`: 100 % en líneas, funciones y sentencias; 91,11 % en ramas, sobre el umbral
  de 80 % configurado en `jest.config.mjs`.
- **Decisión D1 (id):** `id: number` local (sección 8: `INTEGER PRIMARY KEY AUTOINCREMENT`) y
  `remote_id TEXT` (UUID) para Firestore (sección 9.2). No hay contradicción: ambas columnas
  coexisten y `remote_id` se añade en la capa de sincronización.
- **Decisión D2 (errores):** objeto por campo (`ErroresTarea`); la forma
  `detalles: [{ campo, mensaje }]` de la sección 9.3 es contrato HTTP y su traducción pertenece
  a `src/api/`.
- **Decisión D3 (completadas):** `ordenarTareas` no las trata distinto (fuera de RF-01…RF-06);
  `estaVencida` es puramente temporal y la UI decide el estilo con `estaVencida(t) && !t.completada`.
- **Decisión (orden):** las vencidas van primero aunque tengan peor prioridad. Es una decisión de
  UX: la sección 7 solo pide «ordenar por prioridad y fecha» y no especifica este desempate.
- **Pendiente:** commit y push a cargo del humano.

## 2026-11-14 · Hito 2 · Persistencia local con expo-sqlite
- **Propósito:** esquema de la sección 8, migraciones idempotentes, apertura con WAL y
  claves foráneas, y CRUD parametrizado con SQL literal. Sin pantallas.
- **Evidencia:** pruebas escritas antes del código en `src/db/__tests__/` y
  `src/repositories/__tests__/`; el rojo inicial fue `Cannot find module` para
  `esquema`, `migraciones`, `abrir` y `tarea.repositorio`. Después, `npm run check` en
  verde con 41/41 pruebas (1 esquema, 6 migraciones, 1 apertura, 10 repositorio, 23 dominio).
- **Validación:** cobertura `src/db/`: 100 % líneas/funciones/sentencias y 88,88 % ramas;
  `src/repositories/`: 100 % en las cuatro métricas. Umbrales de 80 % añadidos a
  `jest.config.mjs`. Typecheck, ESLint y Prettier en verde.
- **Prueba corregida durante el rojo:** la comprobación de «actualizar no incluye id»
  usaba `not.toContain("id")` sobre el `SET`, pero `prioridad` y `notificacion_id`
  contienen la subcadena `id`. Se corrigió la prueba para comparar los nombres de
  columna exactos; el SQL de producción no cambió.
- **Decisión C3 (filas inválidas):** `filaATarea` devuelve
  `{ ok: false, error }`; `listar` y `obtener` lanzan
  `Error("fila de tarea inválida: id=<id>")`. No filtran en silencio.
- **Decisión C5 (validación):** `crear` no valida; la sección 7 se aplica en
  `src/services/tarea.ts` (`validarTarea`) y la pantalla la invocará. El repositorio solo
  persiste datos ya validados.
- **Decisión (actualizar):** reemplazo completo de los cinco campos editables con SQL
  fijo; `id` solo aparece en el `WHERE` y `completada` tiene su propia función.
- **Decisión (PRAGMA user_version):** SQLite no admite parámetros en `PRAGMA`; el número
  proviene solo de la lista interna de migraciones y se valida como entero no negativo.
  Las consultas del repositorio son todas literales con `?`.
- **Pendiente:** commit y push a cargo del humano.

## 2026-11-14 · Hito 3A · Caso corregido 2 — editar una tarea vencida
- **Propósito:** lógica de aplicación (`tareas.servicio.ts` y `filtros.ts`) antes de las pantallas.
- **Propuesta de la IA:** `actualizarTarea` validaba la entrada completa con `validarTarea`
  antes de leer la fila existente.
- **Corregido en revisión, antes de construir el formulario:** `validarTarea` rechaza todo
  `vence_en` anterior a hoy (sección 7). Una tarea vencida tiene, por definición, fecha
  pasada, así que la edición quedaba bloqueada: no se podía corregir el título ni la
  prioridad de una vencida sin moverle la fecha. En el formulario (3C) habría aparecido
  como «La fecha de vencimiento no puede ser anterior a hoy» al guardar un cambio de título.
- **Corrección aplicada:** `actualizarTarea` lee primero la fila y solo revalida `vence_en`
  si su valor cambió; si la fecha se mantiene, valida con `vence_en: null`. Se añadió
  `ahora` como parámetro para pruebas deterministas.
- **Evidencia:** «permite editar una tarea vencida sin mover la fecha» fallaba antes del
  arreglo (`errores.vence_en`) y pasa después; «rechaza mover la fecha a una fecha pasada»
  sigue rechazando el cambio real. `npm run check` en verde.
- **Decisión:** el repositorio no valida nada; el servicio valida y es la única puerta de
  escritura desde la UI.

## 2026-11-14 · Hito 3A · Lógica de aplicación
- **Propósito:** `src/services/tareas.servicio.ts` y `src/services/filtros.ts`, más
  `sumarUnDia` en el dominio, para que las pantallas no hablen con SQL.
- **Evidencia:** 21 pruebas nuevas (3 de `sumarUnDia`, 13 del servicio, 5 de filtros);
  62/62 en verde.
- **Validación:** `npm run check`; cobertura de `src/services/` 99,25 % líneas y 88,63 %
  ramas; `tareas.servicio.ts` 96,96 % líneas.
- **Decisión:** `posponerUnDia` devuelve `false` si la fecha guardada es corrupta y
  `sumarUnDia` lanza porque es una función pura. El repositorio no valida `vence_en`, así
  que un contrato `Promise<boolean>` no puede lanzar.
- **Decisión:** «semana» = hoy + los 6 días siguientes, incluyendo siempre las vencidas.
  «Hoy» y «Semana» nunca ocultan vencidas (RF-05).
- **Decisión:** las tareas sin fecha o con fecha inválida solo aparecen en «Todas» y en el
  grupo «Sin fecha» de la agrupación por día, siempre al final.
- **Decisión:** el doble de base de datos vive en `src/testing/base-falsa.ts`, fuera de los
  directorios con umbral de cobertura, para no duplicarlo entre pruebas.
- **Pendiente:** commit y push a cargo del humano.

## 2026-11-14 · Hito 3B · Rutas, lista y estado compartido
- **Propósito:** estructura de rutas de la sección 3 (pestañas Pendientes y Hechas) y
  listas conectadas a SQLite, sin formularios ni gestos.
- **Evidencia:** `app/(tabs)/`, `app/tarea/nueva.tsx` (stub), `src/providers/proveedor-tareas.tsx`,
  `src/db/base-sesion.ts`. 65/65 pruebas; `npm run check` y `npm run build` en verde.
- **Decisión:** el proveedor es la única puerta a la base; ninguna pantalla importa
  `expo-sqlite` ni el repositorio.
- **Decisión:** `app/tarea/nueva.tsx` se crea como stub porque `.expo/types` lo genera
  `expo start` (no `expo export`), y sin la ruta el botón llevaría a un 404 y typedRoutes
  fallaría al arrancar el servidor de desarrollo.
- **Corregido en revisión:** `expo export --platform web` fallaba al importar `expo-sqlite`
  (Metro no resuelve `wa-sqlite.wasm`). Se añadió `src/db/abrir.web.ts`: en web la base
  no se abre y el error es explícito; en nativo se usa `abrir.ts`. Verificado con una ruta
  de prueba: el export vuelve a salir en verde.

## 2026-11-14 · Hito 3C · Formularios y CRUD completo
- **Propósito:** crear, editar y eliminar tareas desde el dispositivo (RF-01 y RF-02).
- **Evidencia:** `src/components/formulario-tarea.tsx` y `campo-fecha.tsx` (presentacionales),
  `app/tarea/nueva.tsx`, `app/tarea/[id].tsx`, `crear`/`actualizar`/`eliminar` en el
  proveedor. 69/69 pruebas en 12 suites; `npm run check` y `npm run build` en verde.
- **Validación:** prueba del formulario con título vacío y sin prioridad: aparecen los dos
  mensajes por campo sin abrir SQLite. Prueba del proveedor: `eliminar(1)` vacía el estado
  y ejecuta el DELETE.
- **Decisión:** los valores del formulario usan `Date | null` y solo se convierten a ISO en
  el borde (`entradaDesdeValores`); la UI nunca mezcla formatos de persistencia.
- **Decisión:** el formulario no valida; pinta los `errores` que devuelve el servicio, y si
  no hay errores por campo muestra el `error` general.
- **Decisión:** se añadió el botón «Editar» en cada tarjeta para que `tarea/[id]` sea
  alcanzable; sin él la ruta quedaría muerta y la «U» de CRUD no se podría demostrar.
- **Límite conocido:** `@react-native-community/datetimepicker` no tiene implementación web;
  la exportación web compila, pero el selector solo funciona en dispositivo.
- **Corrección menor:** el título se guarda con `trim()` para no persistir espacios sobrantes.
- **Pendiente:** commit y push a cargo del humano.

## 2026-11-14 · Caso corregido 3 — hueco de aprobación en comandos Git encadenados
- **Propósito:** impedir que `git commit` o `git push` se ejecuten sin aprobación cuando
  viajan dentro de un comando compuesto (`git add ... && git commit ...`).
- **Detectado por:** una prueba que se añadió al conjunto (17) y que **falló al principio**:
  la regla `allow` de `git status *` cubría el comando entero, así que el `ask` de la segunda
  mitad nunca llegaba a aplicarse. El mismo hueco permitía `git status && git push --force`.
- **Evidencia:** evaluación por segmentos en `.opencode/plugins/guard/politica.mjs`
  (separadores `&&`, `||`, `;`, `|`; gana el más restrictivo `deny` > `ask` > `permitir`),
  rama `ask` en `.opencode/plugins/guard/index.ts`, pruebas 17–20 de
  `ia/pruebas/politica.test.mjs` y `npm run check:ia` (20/20).
- **Validación:** `git status && git commit` y `git add . && git push` devuelven `ask`;
  `git push --force` y `git reset --hard` encadenados siguen devolviendo `deny`; `git status`
  y `npm run check` siguen en `permitir`; un separador entre comillas
  (`echo "a; curl x"`) no parte el comando ni bloquea un mensaje de commit con `;`.
- **Decisión:** se pide permiso (`ask`), no se deniega, para conservar el flujo con aprobación
  humana; los `deny` de fuerza/reset se evalúan antes. Se retiraron de `AGENTS.md` dos líneas
  que presentaban `git push origin main` como comando normal y contradecían la regla de pedir permiso.

## 2026-11-14 · Caso corregido 4 — alcance del `ask` y `.env` entre comillas
- **Propósito:** que la evaluación por segmentos no abra dos huecos nuevos.
- **Hueco 1:** el `ask` solo cubría Git. `git status && npm install paquete` devolvía
  `permitir`, porque el `allow` de `git status *` cubre el comando entero. Se añadieron
  reglas `ask` para instalar dependencias (`npm install/i/ci/add`, `npx expo install`,
  `npx create-expo-app`), desplegar (`vercel`, `eas`, `firebase deploy`) y `npx expo start`.
- **Hueco 2:** al reemplazar el contenido entre comillas para segmentar, `cat ".env.local"`
  quedaba como `cat ""` y pasaba. Se detectó con la prueba 21 y se corrigió comprobando
  `ENV_EN_COMANDO` sobre el comando completo antes de segmentar.
- **Evidencia:** `.opencode/plugins/guard/politica.mjs`, `ia/pruebas/politica.test.mjs`
  (pruebas 20–23) y `npm run check:ia` (23/23).
- **Validación:** `git status && npm install x`, `npm run check && vercel --prod` y
  `ls && npx expo install y` devuelven `ask`; `cat ".env.local"` devuelve `deny`;
  `echo "a; curl x"` sigue en `permitir`.
- **Decisión:** el `ask` se evalúa por segmento, no solo por el primer binario del comando:
  cualquier segmento que instale, despliegue o escriba en Git pide aprobación humana.

## 2026-11-15 · Hito 4 · Gestos, notificaciones locales y sacudida
- **Propósito:** cumplir las capacidades del dispositivo sin cambiar el esquema de la
  sección 8 ni tocar la API: deslizar para completar/posponer, recordatorio local 30
  minutos antes y deshacer con el acelerómetro.
- **Evidencia:** `src/services/recordatorio.ts`, `notificaciones.ts`,
  `recordatorios.servicio.ts`, `src/providers/use-acciones-tareas.ts`,
  `src/providers/proveedor-tareas.tsx`, `src/components/tarea-deslizable.tsx`,
  `aviso-tareas.tsx`, `barra-deshacer.tsx`, `control-sacudida.tsx`,
  `src/sensors/use-sacudida.ts` y sus pruebas. `jest.setup.ts` centraliza los mocks
  de `expo-notifications`, `expo-sensors`, `react-native-reanimated` y
  `react-native-gesture-handler`; `jest.config.mjs` añade el resolver de Reanimated,
  el setup y el umbral de `src/sensors/`.
- **Validación:** `npm run check` (typecheck, ESLint, Prettier y cobertura),
  `npm run check:ia` (23/23) y `npm run build` (export web) en verde. La cobertura
  de `src/sensors/` queda por encima del 80 %. No se verificó en dispositivo físico:
  permisos, canal Android, sacudida y notificación real quedan pendientes de la
  matriz manual.
- **Decisión (plugins):** se verificó que `expo-sensors` 58.0.5 incluye
  `app.plugin.js`/`withSensors`; por eso se declara como plugin con
  `motionPermission`, además de `expo-notifications`. No se añadió `expo-location`.
- **Decisión (enum):** el enum correcto es `SchedulableTriggerInputTypes.DATE`,
  no `ScheduledTriggerInputTypes.DATE`; el adaptador y el mock usan el nombre real.
- **Decisión (fecha sin hora):** `aFecha()` sigue interpretando `YYYY-MM-DD` como
  medianoche para vencimiento/orden, pero el recordatorio normaliza esa fecha a las
  09:00 locales y avisa 30 minutos antes. Está cubierto por pruebas; el formulario
  sigue enviando ISO con hora.
- **Decisión (deshacer):** profundidad 1; cubre completar/desmarcar, posponer y
  editar. Crear y eliminar quedan fuera porque restaurar una fila eliminada exigiría
  borrado lógico o reinserción con el mismo `id`. El botón «Deshacer» está siempre
  visible y se deshabilita si no hay acción.
- **Decisión (permisos):** notificaciones se piden al guardar una tarea con fecha,
  nunca al arrancar; movimiento se pide al encender «Agitar para deshacer». Si se
  deniega, la tarea se guarda y el aviso se muestra con `accessibilityRole="alert"`.
- **Decisión (`notificacion_id`):** sale de `EntradaTarea`; `actualizarTarea` conserva
  el id existente y solo el servicio de recordatorios lo programa, cancela o limpia.
- **Commits locales:** `2b44b2e` (recordatorios) y `6591579` (gestos, deshacer y
  sacudida); el push queda a cargo del humano.
- **Pendiente:** matriz manual en dispositivos físicos y development build.

## 2026-11-15 · Autenticación y sincronización
- **Propósito:** registro/login contra la API, tokens en SecureStore, refresh
  único ante 401, migración v2 para sincronización, subida de pendientes,
  bajada con `since`, borrado lógico y conflictos por última escritura.
- **Evidencia:** `src/api/` (configuración, errores, HTTP, auth, tareas,
  cliente autenticado y almacén SecureStore con shim web), `src/services/`
  (`sesion.servicio.ts`, `cuenta.servicio.ts`, `conflictos.ts`,
  `mapeo-tareas.ts`, `sincronizacion*.ts`), migración v2 en
  `src/db/esquema.ts`, repositorio con campos de sincronización y borrado
  lógico, `ProveedorSesion`, guardia de rutas, pantallas `(auth)/login`,
  `(auth)/registro`, `app/cuenta.tsx` y estado de sincronización.
- **Validación:** `npm run check` en verde (239/239 pruebas, cobertura global
  94,49 % líneas y 87,17 % ramas; `src/api/` 94,27 % líneas y 85,16 % ramas;
  `src/repositories/` 100 % líneas y 92,85 % ramas), `npm run check:ia`
  (23/23) y `npm run build` (export web) en verde. Sin red real, sin cuentas
  reales y sin secretos en las pruebas.
- **Decisión (UUID):** se agregó `expo-crypto` (`~58.0.8`) con
  `npx expo install expo-crypto` y se usa `Crypto.randomUUID()`. Se eliminó el
  generador propio no criptográfico. `src/services/id.ts` es solo un envoltorio
  inyectable.
- **Decisión (primer login):** confirmado por el humano: si `usuario_id` está
  vacío y hay tareas locales, se avisa y se purgan cuando el login/registro
  termina **correctamente**, antes de sincronizar. Si el login falla o se
  cancela, las tareas se conservan. No se asocian tareas viejas en silencio.
- **Decisión (logout):** se purgan tokens y datos locales después de confirmar
  si hay pendientes. El objetivo es que la siguiente cuenta no vea tareas de la
  anterior en una SQLite no cifrada.
- **Decisión (migración):** v2 solo añade columnas, backfill de `updated_at` y
  `pending = 1`, índices y la tabla `sincronizacion`. No se reconstruye la
  tabla ni se toca `notificacion_id`.
- **Decisión (conflictos):** se comparan instantes, no strings. El remoto más
  nuevo gana; un local pendiente más nuevo se conserva; una tumba remota gana
  en empate para no resucitar tareas.
- **Decisión (cursor):** la API usa `updated_at > since`. Si una página de 500
  no avanza, se detiene y se informa. Queda pendiente coordinar con la API un
  desempate por `id`.
- **Decisión (`notificacion_id`):** se excluye con lista blanca en
  `mapeo-tareas.ts`; las pruebas verifican que el cuerpo de `PUT` no lo
  contiene. Los cambios remotos reconcilian la notificación local sin marcar
  `pending`.
- **Decisión (red):** `ErrorRed` y `ErrorTiempo` no cierran la sesión; solo un
  401 tras el refresh o un refresh rechazado lo hacen. El refresh es
  single-flight y cada petición reintenta una sola vez.
- **Decisión (logout durante refresh):** si la sesión se cierra mientras hay un
  refresh en vuelo, no se vuelve a guardar la sesión anterior.
- **Pendiente:** prueba del APK en Android por un tercero, demo de IA y
  verificación de SecureStore en un build instalado. Push a cargo del humano.

## 2026-11-15 · Cierre · APK con EAS

- **Propósito:** generar el APK instalable y dejar un enlace de descarga en el
  README para la entrega.
- **Evidencia:** build EAS `8e381ee9-610e-4ea9-b9c6-dffde4f03793`, perfil
  `preview`, Android internal distribution, `1.0.0 (1)`, commit `8adf593`;
  artefacto público en
  `https://expo.dev/artifacts/eas/DHHkFDq_MnEx0zU3ryFYu2TjM3zV5hHJvmq89P9nsxU.apk`.
- **Validación:** build terminado; el artefacto responde `200` con
  `application/octet-stream` y 109 MB. No hay dispositivo Android disponible:
  se comparte el enlace y la instalación la valida un tercero. La app se probó
  en iPhone con Expo Go.
- **Decisión:** enlazar el artefacto directo, no la página privada del build,
  y avisar que expira el 29/11/2026. El README conserva las seis capturas y las
  rutas relativas de `docs/capturas/`.
