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
