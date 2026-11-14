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
