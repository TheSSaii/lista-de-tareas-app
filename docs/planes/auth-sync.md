# Plan del bloque — Autenticación y sincronización de la app

> **Feedback del arquitecto (2026-11-15): aprobado con ajustes.** El plan es
> sólido; antes de implementar, cierra estos puntos:
>
> 1. **UUID de `remote_id`: no uses un identificador no criptográfico.** Para un
>    id de Firestore y una clave de idempotencia necesitas `Crypto.randomUUID()`.
>    `expo-crypto` no está instalado: pide permiso y ejecuta
>    `npx expo install expo-crypto`, justifícalo en el README y elimina
>    `src/services/id.ts` como generador propio. Actualiza la decisión "ninguna
>    dependencia nueva".
> 2. **Primer login con tareas locales:** define qué pasa si hay filas de la
>    etapa sin login y `usuario_id` está vacío. No las mezcles en silencio.
>    Recomendación: mostrar un aviso una vez ("Estas tareas locales se asociarán
>    a tu cuenta") y asociarlas; si el humano prefiere máxima privacidad, purgar
>    tras confirmar. Documéntalo en la bitácora y en el plan.
> 3. **Cursor `since` y empates:** la API usa `updated_at > since`; si una página
>    de 500 no avanza el cursor, el plan actual se detiene y puede dejar datos sin
>    bajar. Añade una nota explícita, una prueba de "no avance" y, si es posible,
>    coordina con la API un desempate por `id`. No lo escondas: es un límite
>    conocido.
> 4. **Contrato de API confirmado en producción (2026-11-15):** health 200;
>    registro 201; login 200; refresh 200 con `refreshToken` nuevo; `/yo` 200;
>    `PUT /api/tareas/:id` 200 con documento completo, sin `notificacion_id` y
>    conservando `created_at`; `GET /api/tareas` 200 con `items` y
>    `servidor_ahora`, incluyendo `deleted_at`; `DELETE` 200 y 404 idempotente;
>    errores 400/401/409/404 con `{ error, detalles? }`; el 500 es genérico.
>    Puedes dar la Fase 0 por verificada y reducirla a los dobles de prueba.
> 5. **Logout:** se aprueba purgar datos locales tras confirmar si hay pendientes.
>    No dejes una sesión anterior con tareas visibles para la siguiente cuenta.
> 6. **HEAD actual:** el plan se escribió contra `756c6a5`; ahora estamos en
>    `b57d2ef` por el fix del selector iOS. Ese cambio no afecta auth/sync, pero
>    actualiza la referencia antes de implementar.
>
> El resto se aprueba: migración aditiva, capas, refresh single-flight, borrado
> lógico, `notificacion_id` local, reconciliación de avisos, pruebas y matriz.
> Implementa después de la prueba física del selector y de aprobar `expo-crypto`.

## Ajustes aplicados al feedback (2026-11-15)

1. **UUID criptográfico:** se usa `Crypto.randomUUID()` de `expo-crypto`. Se
   agregó `expo-crypto` `~58.0.8` con `npx expo install expo-crypto` y quedó en
   `package.json`/`package-lock.json`; se elimina el generador propio y se
   justifica la dependencia en el README.
2. **Primer login con tareas locales:** decisión confirmada por el humano:
   **purga tras confirmación y después de autenticarse**. Si `usuario_id` está
   vacío y hay tareas locales, la pantalla pide confirmación; la purga la hace
   `prepararCuenta` cuando el login/registro termina bien, antes de sincronizar.
   Si el login falla o se cancela, las tareas locales se conservan. Queda
   documentado en la bitácora.
3. **Cursor y empates:** la API usa `updated_at > since`. El plan mantiene la
   guardia de “no avance”, añade una prueba explícita y documenta el límite:
   si una página completa de 500 items comparte el mismo `updated_at` y la API
   no avanza, la sincronización se detiene y lo reporta; no se pierde el cursor
   anterior. Se pedirá a la API un desempate por `id` como mejora futura.
4. **Contrato de producción:** la Fase 0 queda verificada según lo reportado
   (health, registro, login, refresh rotado, `/yo`, PUT completo sin
   `notificacion_id`, GET con `items`/`servidor_ahora`/`deleted_at`, DELETE 200
   y 404 idempotente, errores 400/401/409/404, 500 genérico). Se reduce a los
   dobles de prueba.
5. **Logout:** se aprueba purgar los datos locales tras confirmar si hay
   pendientes. No queda una sesión anterior con tareas visibles.
6. **Referencia:** el plan se escribió contra `756c6a5`; la implementación
   parte de `b57d2ef` (fix del selector iOS) y del commit de documentación
   posterior. Ese cambio no afecta auth/sync.

Revisado el árbol actual, `AGENTS.md`, `docs/03-lista-de-tareas.md` §9.1–9.3,
`ia/BITACORA.md`, `src/db/`, `src/repositories/`, `src/services/`,
`src/providers/` y `app/`. No edité archivos, no instalé nada y no ejecuté
commits ni push.

---

## 1. Diagnóstico del estado actual

Lo que ya existe y condiciona el diseño:

| Área | Estado | Implicación |
|---|---|---|
| Esquema | Solo migración v1; `migrar()` es transaccional y usa `PRAGMA user_version` | La v2 debe ser aditiva y probarse sobre una base v1 con datos |
| Repositorio | `crear/actualizar/marcarCompletada` no sellan `updated_at` ni `pending`; `eliminar` hace `DELETE` físico | Hay que cambiar la semántica de borrado y todos los caminos de escritura |
| Dominio | `Tarea` no tiene campos de sincronización | No contaminar la UI: tipo separado para sincronización |
| `notificacion_id` | Ya está fuera de `EntradaTarea` y solo lo maneja el servicio de recordatorios | Se mantiene local; el mapeo a la API lo excluye explícitamente |
| Proveedor | `ProveedorTareas` abre SQLite y carga tareas sin conocer la sesión | Debe pasar a depender de `ProveedorSesion` y disparar sincronización |
| Tests | Varias pruebas comparan SQL exacto (`INSERT`, `DELETE`, `SELECT`) | Cambiarán de forma deliberada; no se debilitan, se actualizan al contrato nuevo |
| Dependencias | `expo-secure-store` ya está instalado y declarado como plugin | No hace falta instalar nada para este bloque |
| Cobertura | `src/api/` no está en `collectCoverageFrom` | Añadirlo con umbral 80 % |

---

## 2. Decisiones de arquitectura

| Tema | Decisión propuesta | Alternativa y motivo |
|---|---|---|
| **Ubicación del cliente HTTP** | `src/api/`: configuración, transporte, errores, auth y tareas | Un solo `fetch` suelto en servicios rompe la separación de capas |
| **Token** | `expo-secure-store` con claves separadas: `token`, `refresh_token`, `sesion_usuario`, `expira_en` | Guardar un JSON único puede superar límites de tamaño en algunos dispositivos; `AsyncStorage` queda prohibido |
| **Web** | `sesion.almacen.web.ts` en memoria, sin persistencia | `expo-secure-store` no es funcional en web; así `npm run build` sigue funcionando sin debilitar la regla de seguridad |
| **Refresh** | Una sola promesa compartida (*single-flight*) por servicio; cada petición reintenta **una vez** | Sin esto, varios 401 simultáneos lanzan varios refresh y rotan el refresh token varias veces |
| **Expiración** | Guardar `expira_en` absoluto calculado con `expiraEnSeg`; no bloquear el arranque por token vencido | Un refresh proactivo introduce reloj local; el 401 sigue siendo la fuente de verdad |
| **Migración v2** | Solo `ALTER TABLE ADD COLUMN` + backfill + índices + tabla de metadatos; sin reconstruir la tabla | Una reconstrucción de `tarea` puede perder datos o romper FKs si se hace mal |
| **`remote_id`** | Se genera con `Crypto.randomUUID()` al crear localmente; filas antiguas lo reciben de forma perezosa antes del primer PUT | Un id de Firestore y clave de idempotencia debe ser criptográfico; no se usa `Math.random` |
| **Borrado** | Lógico: `deleted = 1`, `pending = 1`; `listar/obtener` filtran `deleted = 0` | El borrado físico impide propagar el `DELETE` y recibir tumbas del servidor |
| **Conflicto** | Última escritura gana comparando instantes `updated_at`; subir primero y luego bajar | Comparar fechas como texto es frágil: `2026-11-01` vs ISO con hora. Se convierte a epoch |
| **Cursor** | Tabla `sincronizacion(clave, valor)`: `usuario_id`, `tareas_since`, `ultima_sync` | No añadir columnas de sincronización a la tabla de usuario ni variables globales de módulo |
| **Cuenta y datos locales** | Primer login con `usuario_id` vacío y tareas locales: aviso y purga solo tras confirmar. Logout: confirmar si hay pendientes y purgar | Los datos de dos cuentas no deben mezclarse en la misma SQLite y SQLite local no está cifrado |
| **`notificacion_id`** | Nunca se serializa a la API; al aplicar cambios remotos se reconcilia la notificación local | El servidor no debe conocer IDs locales de Expo |
| **Dependencias** | `expo-crypto` agregado para `randomUUID()`; nada más | `expo-secure-store` ya está; `fetch` y `AbortController` vienen con React Native/Expo |

---

## 3. Contrato confirmado en producción (Fase 0 verificada)

Verificado el 2026-11-15:

- `GET /api/health` → 200.
- Registro → 201; login → 200; refresh → 200 con `refreshToken` nuevo; `/yo` → 200.
- `PUT /api/tareas/:id` → 200 con documento completo, sin `notificacion_id` y
  conservando `created_at`.
- `GET /api/tareas` → 200 con `items` y `servidor_ahora`, incluyendo `deleted_at`.
- `DELETE /api/tareas/:id` → 200; `404` es idempotente.
- Errores 400/401/409/404 con `{ error, detalles? }`; 500 genérico.
- `EXPO_PUBLIC_API_URL` es pública, HTTPS y sin secretos.

La Fase 0 se reduce a los dobles de prueba. Cualquier diferencia futura se
ajusta solo en `src/api/tareas.api.ts` y el mapeo, sin propagarse a la UI.

---

## 4. Fases, archivos y primera prueba en rojo

### Fase 0 — Contrato, dobles de prueba y preparación

**Objetivo:** dejar el terreno listo sin tocar aún la lógica de negocio.

**Archivos:**
- `jest.setup.ts`: mock en memoria de `expo-secure-store`.
- `src/testing/fetch-falso.ts`: `fetch` tipado con cola de respuestas y captura de peticiones.
- `src/testing/api-falsa.ts`: implementación falsa de `ApiTareas` para las pruebas de sincronización.
- `jest.config.mjs`: añadir `src/api/**/*.ts` a cobertura.

**Primera prueba en rojo:** `src/api/__tests__/http.test.ts` falla por `Cannot find module '../http'`.

**Criterio de aceptación:** ninguna prueba usa red real; las 69+ pruebas existentes siguen en verde.

---

### Fase 1 — Migración v2 y repositorio sincronizable

**Archivos:**
- `src/db/esquema.ts` (migración v2).
- `src/db/__tests__/esquema.test.ts` y `migraciones.test.ts`.
- `src/repositories/tarea.repositorio.ts`.
- `src/repositories/__tests__/tarea.repositorio.test.ts`.
- `src/testing/base-falsa.ts` (fixtures con campos nuevos).
- `src/repositories/sincronizacion.repositorio.ts` y su prueba.
- `src/db/__tests__/migrar-datos.test.ts` o prueba equivalente.

**Contenido de la migración v2, en este orden:**

```sql
ALTER TABLE tarea ADD COLUMN remote_id TEXT;
ALTER TABLE tarea ADD COLUMN updated_at TEXT;
ALTER TABLE tarea ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tarea ADD COLUMN pending INTEGER NOT NULL DEFAULT 0;
UPDATE tarea SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE updated_at IS NULL;
UPDATE tarea SET pending = 1;
CREATE UNIQUE INDEX idx_tarea_remote_id ON tarea(remote_id) WHERE remote_id IS NOT NULL;
CREATE INDEX idx_tarea_pendiente ON tarea(pending);
CREATE TABLE sincronizacion (
  clave TEXT PRIMARY KEY NOT NULL,
  valor TEXT NOT NULL
);
```

- `remote_id` queda `NULL` en filas antiguas y se asigna perezosamente antes del primer PUT.
- Se mantiene el `id` local `INTEGER`; no se toca.
- No se usa `DEFAULT CURRENT_TIMESTAMP` ni se reconstruye la tabla.
- `notificacion_id` no cambia y `actualizarNotificacion` sigue sin marcar `pending`.

**Cambios de repositorio:**
- `crear`: inserta `remote_id`, `updated_at` con hora UTC de SQLite y `pending = 1`.
- `actualizar`, `marcarCompletada`, `eliminar`: sellan `updated_at` y `pending = 1`; `eliminar` pasa a `UPDATE ... SET deleted = 1`.
- `listar` y `obtener`: `WHERE deleted = 0`.
- Nuevas funciones: `listarPendientes`, `obtenerPorRemoteId`, `insertarRemoto`, `actualizarRemoto`, `asegurarRemoteId`, `contarPendientes`, `marcarSincronizada`.
- Tipos separados: `TareaPendiente`, `TareaRemota`, `FilaTareaSync`; `Tarea` de dominio no cambia.

**Primera prueba en rojo:**
1. `esquema.test.ts` espera 2 migraciones y falla porque solo hay 1.
2. `tarea.repositorio.test.ts` espera que `eliminar` haga `UPDATE tarea SET deleted = 1...` y falla porque hoy hace `DELETE`.
3. `listar` espera `WHERE deleted = 0` y falla.

**Criterio de aceptación:**
- `npm run check` en verde.
- Prueba de migración sobre una base v1 simulada: las columnas se añaden, no se borra ninguna fila y `pending` queda en 1.
- Verificación manual en dispositivo: crear tareas con la versión anterior, actualizar la app y comprobar que siguen ahí, con `remote_id` asignado tras la primera sincronización.

---

### Fase 2 — Cliente HTTP y API de autenticación

**Archivos:**
- `src/api/config.ts`: normaliza `EXPO_PUBLIC_API_URL`, elimina barra final, exige HTTPS y detecta ausencia de configuración sin romper el arranque.
- `src/api/errores.ts`: `ErrorApi` con `estado`, `mensaje`, `detalles`; `ErrorRed` y `ErrorTiempo`.
- `src/api/http.ts`: `fetch` inyectable, timeout con `AbortController`, cabeceras, parseo robusto, forma `{ error, detalles }`.
- `src/api/auth.api.ts`: registro, login, refresh y `yo`.
- `src/api/tareas.api.ts`: listar con `since`, guardar con PUT, eliminar con DELETE, mapeo con lista blanca de campos.
- Pruebas en `src/api/__tests__/`.

**Reglas del transporte:**
- Timeout por defecto 10 s; el temporizador se limpia siempre.
- Respuesta 204 o sin cuerpo no intenta parsear JSON.
- Respuesta no JSON se convierte en error controlado, nunca en un `SyntaxError` crudo.
- 500 no muestra detalles internos.
- `Authorization: Bearer` solo en rutas privadas; nunca en query string.
- El cuerpo de PUT incluye `titulo`, `descripcion`, `prioridad`, `vence_en`, `completada`; **nunca** `notificacion_id`, `pending`, `deleted` ni `id` local.

**Primera prueba en rojo:**
- `http.test.ts` falla por módulo inexistente.
- Al implementarlo, falla la prueba de timeout si no se aborta.
- `tareas.api.test.ts` falla si el cuerpo contiene `notificacion_id`.

**Criterio de aceptación:**
- Pruebas con `fetch` falso: 200, 400 con `detalles`, 401, 409, 429, 500, timeout, error de red y respuesta no JSON.
- Prueba explícita: el payload de PUT no tiene `notificacion_id`.
- Prueba de URL: `https://api.example.test` se usa en pruebas; no se lee ninguna variable real ni `.env`.

---

### Fase 3 — Almacén seguro, servicio de sesión y refresh único

**Archivos:**
- `src/api/sesion.almacen.ts` y `src/api/sesion.almacen.web.ts`.
- `src/services/sesion.servicio.ts`.
- `src/services/__tests__/sesion.servicio.test.ts`.
- `src/api/__tests__/cliente-autenticado.test.ts`.
- `src/services/id.ts` como envoltorio mínimo de `Crypto.randomUUID()` de
  `expo-crypto` (no es un generador propio; existe para inyectarlo en pruebas).

**Comportamiento:**
- Guardar y leer token, refresh token, usuario y expiración por claves separadas.
- Validar la forma de lo leído; datos corruptos se borran y se trata como invitado.
- `renovar()` es *single-flight*: dos llamadas concurrentes comparten la misma promesa.
- Cada petición privada: si recibe 401, renueva una vez, reintenta una vez y, si vuelve a fallar, cierra sesión.
- Las rutas de login, registro y refresh no se reintentan.
- El refresh persistido reemplaza al anterior si la API rota el token.
- Al cerrar sesión se borran todas las claves; nunca se escribe en `AsyncStorage`.

**Primera prueba en rojo:**
- `sesion.servicio.test.ts` falla por módulo inexistente.
- La prueba de dos peticiones simultáneas con 401 falla si `fetch` de refresh se llama dos veces.
- La prueba de refresh fallido espera sesión cerrada y tokens borrados.

**Criterio de aceptación:**
- Con `expo-secure-store` simulado, se verifica que se guardan y borran las claves correctas.
- No se registra el token en ningún mensaje de error.
- La variante web no importa `expo-secure-store` y no rompe `npm run build`.

---

### Fase 4 — Proveedor de sesión, pantallas y guardia de rutas

**Archivos:**
- `src/providers/proveedor-sesion.tsx`.
- `src/components/formulario-auth.tsx` y su prueba.
- `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/registro.tsx`.
- `app/cuenta.tsx` (correo y cierre de sesión).
- `app/_layout.tsx` (orden `ProveedorSesion` → `ProveedorTareas` → `Stack`).
- `app/(tabs)/_layout.tsx` o guardia equivalente.
- `src/services/navegacion.sesion.ts` (función pura de destino) y su prueba.

**Comportamiento:**
- Al arrancar: leer almacén. Si hay sesión, entrar de inmediato en modo autenticado y validar `/api/auth/yo` en segundo plano solo si hay red.
- Si `/yo` devuelve 401 tras un refresh fallido → invitado y login.
- Si hay error de red → mantener sesión y modo sin conexión.
- Mientras `cargando`, mostrar splash; no redirigir antes de saber el estado.
- Invitado en rutas privadas → `/login`; autenticado en rutas de auth → `/`.
- El formulario valida correo y contraseña ≥ 8; los errores de campo y el error general usan `accessibilityRole="alert"`.
- No se guarda la contraseña en ningún sitio.
- Cierre de sesión: si hay pendientes, confirmación; luego borrar tokens y purgar datos locales del usuario anterior.

**Primera prueba en rojo:**
- `formulario-auth.test.tsx` falla porque no existe el campo con etiqueta accesible.
- `proveedor-sesion.test.tsx` falla porque no existe el proveedor; al implementarlo, falla el caso “arranque sin red conserva la sesión” si se bloquea esperando `/yo`.
- `navegacion.sesion.test.ts` falla porque la función pura no existe.

**Criterio de aceptación:**
- Las pantallas no llaman a `fetch` ni a SQLite directamente; solo usan `useSesion`.
- La app no muestra tareas antes de resolver la sesión.
- El cierre de sesión es accesible por botón con `accessibilityLabel`.

---

### Fase 5 — Sincronización

**Archivos:**
- `src/services/conflictos.ts`: decisión pura última-escritura-gana.
- `src/services/mapeo-tareas.ts`: remoto ↔ local, lista blanca de campos.
- `src/services/sincronizacion.subida.ts`.
- `src/services/sincronizacion.bajada.ts`.
- `src/services/sincronizacion.ts`: orquestador.
- `src/providers/use-sincronizacion.ts` o hook equivalente.
- `src/providers/proveedor-tareas.tsx` (integración).
- `src/repositories/sincronizacion.repositorio.ts`.
- Pruebas en `src/services/__tests__/` y `src/providers/__tests__/`.

**Flujo propuesto:**

1. **Subida de pendientes**
   - Leer `pending = 1` ordenado por `updated_at`.
   - Si `remote_id` es `NULL`, generarlo y persistirlo antes del PUT.
   - Si `deleted = 1` → `DELETE /api/tareas/:id`; un 404 se considera éxito idempotente.
   - Si no → `PUT /api/tareas/:id` con lista blanca de campos.
   - Al éxito: `pending = 0` y `updated_at` igual al `updated_at` devuelto por el servidor.
   - Error de red o timeout: detener la subida, conservar pendientes y devolver estado “sin conexión”.
   - Error 400/413/415 persistente: conservar pendiente, devolver aviso y no bloquear el resto de la app.

2. **Bajada de cambios**
   - `GET /api/tareas?since=<cursor>` con paginación: repetir mientras la página tenga 500 items.
   - **Límite conocido:** la API filtra con `updated_at > since`. Si una página
     completa de 500 items no avanza el cursor (todos comparten el mismo
     `updated_at`), la bajada se detiene, conserva el cursor anterior y reporta
     el aviso. No se finge que se bajó todo. Mejora futura coordinada con la
     API: desempate por `id`.
   - Guardia contra bucles: si una página no avanza el cursor, detener y reportar.
   - Aplicar por página en una transacción SQLite (`BEGIN` / `COMMIT` / `ROLLBACK`).
   - Insertar si no existe `remote_id`; actualizar si existe.
   - `deleted_at != null` se traduce a `deleted = 1`.
   - Persistir el cursor solo después de confirmar la página.

3. **Conflicto**
   - Convertir `updated_at` a instante con `Date.parse`; no comparar strings.
   - Si el remoto es más nuevo → aplicar remoto, `pending = 0`.
   - Si el local es más nuevo → conservar local y reintentar subida.
   - Si son iguales → conservar local; si no está pendiente, no hacer nada.
   - Una fecha inválida se trata como dato corrupto: no se aplica silenciosamente y se reporta.

4. **Reconciliación de recordatorios**
   - Tras aplicar un remoto: si queda completada o borrada → cancelar notificación y limpiar `notificacion_id`.
   - Si sigue pendiente y tiene fecha futura → cancelar la anterior si existe y reprogramar.
   - La reconciliación usa el notificador inyectable y **no** marca `pending`.
   - Un permiso denegado no impide guardar ni sincronizar; se muestra un aviso agregado.

5. **Disparadores**
   - Tras restaurar la sesión y tras login.
   - Después de cada mutación local, en segundo plano y sin bloquear la UI.
   - En `recargar`/“Sincronizar ahora”.
   - Una sola sincronización concurrente: llamadas simultáneas comparten la misma promesa.

**Primera prueba en rojo:**
- `conflictos.test.ts` falla porque la función no existe.
- `sincronizacion.subida.test.ts` falla porque una tarea pendiente no se envía.
- `sincronizacion.bajada.test.ts` falla porque no se inserta un remoto nuevo.
- `proveedor-tareas.test.tsx` falla porque crear una tarea no dispara la sincronización.

**Criterios de aceptación:**
- Una tarea creada sin conexión queda `pending = 1`, se ve en la lista y se sube al recuperar red.
- Una eliminación local se convierte en `DELETE` remoto y no desaparece de la lista hasta marcarse `deleted`.
- Un remoto nuevo aparece localmente y programa recordatorio si corresponde.
- Un remoto completado o borrado cancela la notificación local.
- Un remoto con `notificacion_id` (si alguna vez llegara) no sobrescribe el local.
- El cuerpo de subida no contiene `notificacion_id`.
- El cursor no avanza si falla la transacción.
- No hay bucles de sincronización: aplicar remoto no vuelve a marcar `pending`.

---

### Fase 6 — Integración UI, estado de sincronización y cierre de sesión

**Archivos:**
- `src/components/estado-sincronizacion.tsx` y su prueba.
- `app/(tabs)/index.tsx`, `app/(tabs)/hechas.tsx`, `app/cuenta.tsx`.
- `src/providers/proveedor-tareas.tsx` (estado `sincronizando`, `pendientes`, `ultimaSync`, `sincronizar`).

**Comportamiento:**
- Mostrar “Sincronizando…”, “N cambios pendientes”, “Sin conexión” o “Al día”.
- El error de sincronización no reemplaza la lista ni borra tareas.
- “Sincronizar ahora” tiene `accessibilityLabel`.
- Al cerrar sesión con pendientes, confirmar y explicar que se perderán los cambios no subidos.
- No mostrar mensajes técnicos ni tokens.

**Primera prueba en rojo:** el componente de estado no existe; la prueba del proveedor espera que una mutación con API falsa deje `pendientes = 0` y falla.

---

### Fase 7 — Documentación y cierre

**Archivos:**
- `jest.config.mjs` (cobertura de `src/api/`).
- `README.md` si se documenta la variable pública y el flujo de sesión.
- `ia/BITACORA.md` con propósito, evidencia, validación y decisiones.
- Matriz manual completada.

**Verificación final:** `npm run check`, `npm run check:ia`, `npm run build`.

---

## 5. Diseño de pruebas

### Mocks y reglas

- **`expo-secure-store`**: mock global en `jest.setup.ts` con un `Map` en memoria y `reset` entre pruebas. Nunca se usa el almacén real.
- **`fetch`**: se inyecta un doble tipado; no se llama a `global.fetch` ni a una URL real. Base de pruebas: `https://api.example.test`.
- **API de tareas**: interfaz `ApiTareas` inyectada en sincronización; las pruebas usan `api-falsa.ts`, no HTTP.
- **Notificador**: se reutiliza el patrón de `recordatorios.servicio.test.ts` con un notificador falso.
- **Timers**: `jest.useFakeTimers()` solo para timeout y refresh concurrente; se restauran en `afterEach`.
- **Credenciales**: valores evidentemente falsos (`persona@ejemplo.test`, `token-1`); ninguna cuenta real.
- **Sin `any`**: dobles tipados con `jest.mocked` y tipos de los módulos.
- **Sin red real**: además de inyectar `fetch`, la configuración de pruebas exige `https://api.example.test` y falla si se intenta otra base.

### Suites mínimas

| Suite | Casos clave |
|---|---|
| `http.test.ts` | 200, 204, error `{error,detalles}`, 500 sin detalles, timeout, red caída, JSON inválido, cabecera Bearer |
| `auth.api.test.ts` | registro, login, refresh, `yo`; 409, 401 genérico, 429, contraseña débil |
| `sesion.almacen.test.ts` | guardar/leer/borrar claves; JSON corrupto; web sin persistencia |
| `sesion.servicio.test.ts` | login guarda tokens; logout borra; refresh single-flight; refresh fallido cierra sesión; rotación |
| `cliente-autenticado.test.ts` | 401 → refresh → reintento; segundo 401 → logout; dos 401 simultáneos → un refresh |
| `conflictos.test.ts` | remoto nuevo, remoto más nuevo, local más nuevo, empate, fechas inválidas |
| `sincronizacion.subida.test.ts` | pendiente creado/editado/borrado; 404 idempotente; red caída conserva pendiente; `remote_id` perezoso |
| `sincronizacion.bajada.test.ts` | insertar, actualizar, tumba, conflicto, página de 500, cursor persistido, item inválido, página sin avance de cursor |
| `sincronizacion.test.ts` | orquestación, transacción, reconciliación de notificaciones, single-flight |
| `proveedor-sesion.test.tsx` | sin tokens → invitado; con tokens sin red → autenticado; login; logout; purga por cambio de usuario |
| `proveedor-tareas.test.tsx` | carga local, sync tras login, sync tras mutación, error de sync no borra lista |
| `formulario-auth.test.tsx` | correo inválido, contraseña corta, error accesible, estado de carga |
| `navegacion.sesion.test.ts` | destino según estado y ruta |
| `esquema/migraciones/repositorio` | v2 aditiva, filtros `deleted`, sellos `pending/updated_at`, borrado lógico |

---

## 6. Matriz manual

| Caso | Jest | iOS físico | Android físico | Build web |
|---|---|---|---|---|
| Registro con correo nuevo | Sí (mock) | Sí | Sí | Compila |
| Registro con correo repetido → 409 | Sí (mock) | Sí | Sí | — |
| Login correcto | Sí (mock) | Sí | Sí | Compila |
| Login incorrecto → mensaje genérico | Sí (mock) | Sí | Sí | — |
| Contraseña < 8 → error local | Sí | Sí | Sí | — |
| Tokens en SecureStore y no en AsyncStorage | Sí (mock) + grep | Sí | Sí | No aplica |
| Arranque con sesión y sin red | Sí (mock) | Sí | Sí | — |
| Arranque sin sesión → login | Sí | Sí | Sí | Compila |
| Token expirado → refresh y reintento | Sí (mock) | Esperar 1 h o invalidar token | Ídem | — |
| Refresh fallido → logout | Sí (mock) | Sí | Sí | — |
| Varios 401 simultáneos → un refresh | Sí | Verificar en dev build | Ídem | — |
| Crear tarea sin conexión y subir al reconectar | Sí (fake API) | Sí | Sí | — |
| Editar tarea offline y subir | Sí | Sí | Sí | — |
| Eliminar tarea offline y subir DELETE | Sí | Sí | Sí | — |
| Descargar tarea nueva de otro dispositivo | Sí (fake API) | Sí | Sí | — |
| Conflicto: gana la escritura más nueva | Sí | Sí | Sí | — |
| Borrado remoto elimina de la lista local | Sí | Sí | Sí | — |
| Notificación cancelada al completar desde otro dispositivo | Sí | Sí | Sí | — |
| `notificacion_id` no viaja a la API | Sí + inspección manual | Sí | Sí | — |
| Migración v1 → v2 conserva tareas | Prueba + manual | Sí | Sí | — |
| Cierre de sesión con pendientes avisa | Sí | Sí | Sí | — |
| `npm run build` sin errores | — | — | — | Sí |

**Nota:** la verificación con la API real es manual y con datos de prueba, nunca desde Jest. No se deben pegar tokens ni cuentas en la bitácora, issues o commits.

---

## 7. Riesgos y mitigación

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **Refresh concurrente** | Rotación múltiple del refresh token, sesión perdida | Promesa compartida y reintento único por petición; prueba con dos 401 simultáneos |
| **Borrados lógicos** | Tareas “eliminadas” que reaparecen o se siguen mostrando | `listar/obtener` filtran `deleted`; tombstones con `updated_at`; prueba de tumba remota |
| **Conflictos y reloj del dispositivo** | Una edición vieja pisa una nueva | Comparar instantes, subir primero, guardar `updated_at` del servidor tras PUT; documentar desfase de reloj como límite aceptado |
| **Migración** | Pérdida de tareas existentes | Solo `ALTER TABLE` + backfill; transacción existente; prueba con base v1; verificación manual antes del APK |
| **Arranque sin conexión** | La app queda bloqueada esperando `/yo` | Sesión local primero; `/yo` solo en segundo plano; error de red no cierra sesión |
| **Expiración de tokens** | 401 en cascada o bucles | Refresh una vez, sin reintentar refresh/login; segundo 401 → logout y redirección |
| **Token en el lugar equivocado** | Fuga de credenciales | SecureStore con claves separadas, `.web.ts` en memoria, grep de `AsyncStorage`, revisión del bundle |
| **`notificacion_id` en la API** | Detalle local en Firestore | Mapeo con lista blanca y prueba negativa del payload |
| **Reconciliación de notificaciones** | Recordatorios obsoletos o duplicados | Cancelar antes de reprogramar; no marcar `pending`; permiso denegado no rompe |
| **Paginación de 500** | Cambios perdidos o bucle infinito | Cursor al último `updated_at`, página incompleta termina, guardia de no avance |
| **Sincronización concurrente** | Escrituras duplicadas y estados inconsistentes | *Single-flight* en el proveedor; transacción por página; aplicar remoto no re-marca pendiente |
| **Mezcla de cuentas** | Un usuario ve tareas de otro | `usuario_id` en metadatos; purga al cambiar de cuenta y al cerrar sesión, con aviso si hay pendientes |
| **Contrato real distinto al documentado** | Errores difíciles de diagnosticar | Fase 0 de verificación; adaptador aislado en `src/api/tareas.api.ts` |
| **Web y SecureStore** | `npm run build` roto | Shim `.web.ts` en memoria; build en cada fase |
| **Cobertura de `src/api/`** | Lógica nueva sin pruebas | Añadir umbral 80 % y pruebas de transporte/auth |

---

## 8. Plan de commits

1. `test(api): define transporte, errores y timeout`
2. `feat(api): añade cliente HTTP y API de autenticación`
3. `feat(sesion): guarda tokens en SecureStore y renueva una sola vez`
4. `feat(db): migra tareas para sincronización con borrado lógico`
5. `feat(sync): sube pendientes y baja cambios con última escritura gana`
6. `feat(ui): añade registro, login y cierre de sesión`
7. `feat(sync): integra estado de sincronización y reconciliación de avisos`
8. `docs(ia): registra el plan, las decisiones y la matriz del bloque`

Cada commit debe dejar `npm run check` en verde. Commit y push los hace el humano.

---

## 9. Checklist de terminado

- [ ] `npm run check` en verde: typecheck, ESLint, Prettier y Jest con cobertura.
- [ ] `npm run check:ia` en verde, sin relajar reglas.
- [ ] `npm run build` en verde.
- [ ] Cobertura ≥ 80 % en `src/services/`, `src/db/`, `src/repositories/` y `src/api/`.
- [ ] Sin `any`, `@ts-ignore`, `@ts-nocheck`, reglas desactivadas ni `console.log`.
- [ ] Funciones ≤ 50 líneas, complejidad ≤ 10, anidación ≤ 3, archivos ≤ 300 líneas.
- [ ] Las pantallas no escriben SQL ni llaman a `fetch`; solo usan proveedores.
- [ ] Tokens solo en `expo-secure-store`; cero usos de `AsyncStorage`.
- [ ] `EXPO_PUBLIC_API_URL` es pública, HTTPS y no contiene secretos.
- [ ] Ningún `localhost` en la configuración de producción/APK.
- [ ] `notificacion_id` no se envía a la API ni a Firestore.
- [ ] Migración v2 probada sobre datos v1 y verificada en dispositivo.
- [ ] Crear/editar/eliminar funcionan sin conexión y se sincronizan al reconectar.
- [ ] El refresh concurrente está probado con dos peticiones simultáneas.
- [ ] El cierre de sesión borra tokens y no deja datos de otra cuenta.
- [ ] La app no se rompe si falta la URL, si no hay red o si la sesión expira.
- [ ] La matriz manual está completada y distinguida de lo verificado en Jest.
- [ ] `ia/BITACORA.md` actualizada con propósito, evidencia, validación y decisiones.
- [ ] Sin secretos, sin `.env` y sin cambios fuera del repositorio.

---

## 10. Criterios de aceptación del bloque

1. Un usuario puede registrarse e iniciar sesión contra la API y ve sus tareas.
2. Los tokens viven en `expo-secure-store` y nunca en `AsyncStorage`.
3. El cliente HTTP tiene timeout, normaliza `{ error, detalles }` y renueva el token una sola vez ante 401.
4. Existe un proveedor de sesión con arranque offline, cierre de sesión y guardia de rutas.
5. La migración añade `remote_id`, `updated_at`, `deleted` y `pending` sin perder datos existentes.
6. Las tareas pendientes se suben con PUT/DELETE y los cambios se bajan con `GET ?since=`, con última escritura ganadora.
7. La app sigue funcionando sin conexión y sincroniza al recuperarla.
8. `notificacion_id` permanece local y no aparece en ninguna petición.
9. Las pruebas simulan `fetch` y `expo-secure-store`; no hay red real, cuentas reales ni secretos.

**Decisión pendiente de confirmación de producto:** si al cerrar sesión se purgan siempre los datos locales o se ofrece conservarlos. Mi recomendación es purgar tras confirmar, porque SQLite local no está cifrado y mezclar cuentas es un riesgo mayor que perder cambios no sincronizados.