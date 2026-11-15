## Plan del Hito 4 — capacidades del dispositivo

> **Feedback del arquitecto (2026-11-14): aprobado con ajustes.** Antes de
> implementar, corrige o confirma estos puntos y déjalos en la bitácora:
>
> 1. **No agregues `expo-sensors` a `app.json` sin verificar que tenga config
>    plugin.** Si no lo tiene, no lo pongas como plugin; para iOS usa
>    `ios.infoPlist.NSMotionUsageDescription` solo si el acelerómetro lo exige.
>    `expo-notifications` sí va como plugin.
> 2. **Corrige el nombre del enum de trigger** contra los tipos instalados de
>    `expo-notifications` 58: el plan menciona `ScheduledTriggerInputTypes.DATE`;
>    verifica si el correcto es `SchedulableTriggerInputTypes.DATE` y ajusta el
>    mock y el adaptador.
> 3. **Deja explícita la limitación de deshacer**: cubre completar/desmarcar,
>    posponer y editar; crear y eliminar quedan fuera. El botón «Deshacer» debe
>    seguir funcionando siempre. La demo de la sacudida debe hacerse después de
>    completar o posponer, no después de eliminar. Si decides incluir eliminar,
>    justifica cómo restauras el `id` y el `notificacion_id`.
> 4. **Añade pruebas explícitas** para: posponer una tarea sin fecha (no toca
>    SQLite y muestra aviso), deshacer después de completar (restaura y
>    reprograma/cancela según corresponda), y permiso denegado a nivel de
>    proveedor (la tarea se guarda y el aviso se muestra con
>    `accessibilityRole="alert"`).
> 5. **Decide y prueba el caso `vence_en` sin hora**: hoy `aFecha()` lo lleva a
>    medianoche local, así que una tarea del 20 dispara el 19 a las 23:30.
>    Documenta ese comportamiento o normalízalo a las 09:00 locales; no lo dejes
>    implícito. El formulario envía ISO con hora, pero la API acepta fecha sin
>    hora y la sincronización futura puede traerla.
> 6. **Mantén `notificacion_id` fuera de `EntradaTarea`** y asegura que
>    `actualizarTarea` no lo borre. La pantalla no debe reenviar un detalle de
>    persistencia; el servicio de recordatorios es el único dueño de ese id.
> 7. **Fase 0 en dispositivo físico antes del resto**: confirma permisos, canal
>    Android, gestos con Reanimated 4/React Compiler y limitaciones de Expo Go.
>    Si algo no se puede probar en físico, dilo y no lo marques como verificado.
> 8. **No cambies el esquema, no añadas `expo-location` y no toques la API.**
>    El `jest.setup.ts` nuevo no debe romper las 69 pruebas existentes.
>
> El resto del plan se aprueba: capas, fases, pruebas, matriz manual y riesgos.
> Implementa en el orden propuesto, con la prueba en rojo primero y `npm run
> check`, `check:ia` y `build` en verde al final de cada fase.

Revisado contra `main` = `83373a2`, árbol limpio. No modifiqué archivos, no instalé nada y no ejecuté commits. Tomo como válido el estado que reportas: `npm run check` 69/69, `check:ia` 23/23 y `build` en verde.

---

## 1. Supuestos

- Las dependencias ya instaladas se usan tal cual: `expo-notifications` 58.1.9, `expo-sensors` 58.0.5, `react-native-gesture-handler` 3.3.0 y `react-native-reanimated` 4.7.1. No se agregan paquetes.
- `expo-location`, la API, el login, la sincronización, la repetición de tareas y el APK quedan fuera.
- La columna `notificacion_id` ya existe en SQLite y no requiere migración. El esquema de la sección 8 no cambia.
- `vence_en` puede ser ISO con hora (lo que produce el formulario) o `YYYY-MM-DD` (permitido por la sección 9.2). La app corre en la zona horaria local del dispositivo.
- El recordatorio se considera una función automática de toda tarea con fecha; no hay una columna nueva para “recordatorio activo”.
- La app se probará en dispositivos físicos. Los sensores no existen en muchos emuladores.
- El humano hará los commits y el push. Yo solo dejaré el árbol listo.
- `notificacion_id` es un identificador local de Expo; no forma parte del contrato de Firestore ni de la API.

---

## 2. Preguntas abiertas

### Bloquean la decisión de producto/UI

1. **¿El recordatorio es automático o requiere un interruptor?**
   - Recomendación: automático para toda tarea con `vence_en`. Al guardar una tarea con fecha se pide permiso, explicando para qué. Así se cumple el criterio 1 sin pasos extra.
   - Alternativa: interruptor por tarea. Obligaría a decidir cómo persistir “recordatorio apagado” sin añadir columna (podría ser `notificacion_id = null`), lo que confunde “apagado” con “sin permiso”.
   - Esta decisión afecta el formulario y la demostración del criterio 1, no la lógica pura.

2. **¿Se acepta un interruptor “Agitar para deshacer” en la pantalla de Pendientes?**
   - Recomendación: sí. Es la forma limpia de cumplir “pedir permiso solo cuando el usuario active la función”. Empieza apagado y, al encenderlo, se comprueba disponibilidad y se pide permiso de movimiento.
   - Alternativa: activar la sacudida siempre. En iOS/web puede implicar pedir permiso al montar la pantalla, lo que contradice la regla de la sección 5.
   - Sin este interruptor, la sacudida no se puede demostrar sin pedir permiso de forma implícita.

3. **¿Se acepta que `isAvailableAsync()` para notificaciones sea un envoltorio propio?**
   - `expo-notifications` 58.1.9 no exporta `isAvailableAsync()`. Sí lo hace `expo-sensors`.
   - Recomendación: crear `isAvailableAsync()` en el adaptador de notificaciones: en web devuelve `false`; en nativo hace una comprobación real de disponibilidad/permisos dentro de `try/catch`. El acelerómetro usará el `isAvailableAsync()` real de la librería.
   - Alternativa: no implementar el envoltorio y argumentar que la regla solo aplica a sensores. Prefiero cumplir la letra con una función equivalente y documentar la diferencia.

### No bloquean, pero requieren confirmación

4. `vence_en` sin hora: `aFecha()` lo interpreta como medianoche local. Un recordatorio de una tarea “2026-11-20” se dispararía el 19 a las 23:30. El formulario siempre envía ISO con hora, así que el impacto es bajo. Recomendación: mantener la semántica actual y no cambiar el dominio.
5. ¿Deshacer debe cubrir también crear y eliminar? Recomendación: no. Restaurar una eliminada exige borrado lógico o reinserción con el mismo `id`, y eso toca esquema/API. La creación se puede deshacer con “eliminar”, pero es una acción destructiva que no pedía el alcance.
6. ¿Se reprograma la notificación al cambiar solo el título? Recomendación: sí, para que el texto mostrado no quede obsoleto. Alternativa: solo reprogramar si cambia la fecha.
7. ¿La notificación debe mostrarse también con la app abierta? Recomendación: sí, con banner, lista y sonido; es un recordatorio, no una notificación silenciosa.
8. ¿Se debe pedir permiso de alarmas exactas en Android 12+? Recomendación: no. Se acepta la entrega “best effort” del sistema; pedir `SCHEDULE_EXACT_ALARM` añade configuración y fricción fuera del alcance.
9. ¿Cobertura de `src/sensors/`? Recomendación: incluir la lógica pura en `src/services/` y, si el hook se prueba bien, añadir también `src/sensors/` al umbral. No bajar ningún umbral existente.
10. ¿Tareas antiguas sin `notificacion_id` deben recibir recordatorio al abrir la app? Recomendación: no. Solo se programa al crear/editar/deshacer, para no pedir permiso al arrancar.

---

## 3. Decisiones con alternativas

| Tema | Decisión propuesta | Alternativas y motivo |
|---|---|---|
| **Vencimiento a menos de 30 min** | Si `vence > ahora` pero `vence - 30 min <= ahora`, programar un aviso inmediato (ahora + 1 s) con texto “Vence en menos de 30 minutos”. Si `vence <= ahora`, no programar. | (a) No programar: el usuario no recibe nada. (b) Programar en el pasado: el sistema puede ignorarlo o dispararlo de forma impredecible. La inmediata conserva el aviso y es testeable. |
| **Posponer sin fecha** | No modificar la base, devolver `false` y mostrar aviso accesible: “Esta tarea no tiene fecha; edítala para asignar una”. No se registra acción de deshacer. | (a) Asignar mañana a las 09:00: cambia la semántica de “posponer 1 día” sin que exista fecha. (b) Abrir el formulario automáticamente: acopla el gesto a navegación. La opción elegida mantiene el contrato actual de `posponerUnDia`. |
| **Semántica y tamaño de la pila de deshacer** | Una sola acción: guardar una instantánea de la `Tarea` anterior a la última mutación. Cubre completar/desmarcar, posponer y editar. No cubre crear ni eliminar. Al deshacer se restaura la instantánea y se recalcula la notificación. La pila vive solo en memoria del proveedor y se pierde al reiniciar. | (a) Profundidad 5/10: más útil, pero la UI y las pruebas crecen y el requisito dice “la última acción”. (b) Deshacer por operación inversa: más código y más ramas. (c) Incluir eliminar: requiere borrado lógico o reinserción con `id`, fuera del esquema actual. |
| **Umbral y debounce de la sacudida** | Magnitud `sqrt(x²+y²+z²) > 2.2 g`, muestreo cada 100 ms, enfriamiento de 1000 ms desde la última sacudida aceptada. Solo se evalúa con la pantalla enfocada, el interruptor activo y el sensor disponible. | (a) 1.8 g / 500 ms: más fácil de demostrar, más falsos positivos al caminar. (b) 2.5 g / 1500 ms: menos falsos positivos, más difícil de disparar. El valor final se calibra en dispositivo físico; la función pura permite cambiarlo sin tocar el hook. |
| **Dónde se pide el permiso** | Notificaciones: al guardar la primera tarea con fecha, que es el momento en que se “activa” el recordatorio. Nunca al arrancar. El formulario muestra un texto explicativo junto a la fecha. Movimiento: al encender el interruptor “Agitar para deshacer”. El servicio/proveedor orquesta; el adaptador llama al sistema; la pantalla solo muestra el aviso. | (a) Pedirlo al abrir la app: peor experiencia y contradice la sección 5. (b) Pedirlo desde la pantalla: rompe la capa pantalla → proveedor → servicio. (c) Pedirlo al encender un interruptor por tarea: obliga a persistir más estado. |
| **Conflicto swipe vs scroll de `SectionList`** | `Gesture.Pan` con activación horizontal de ±16 dp, fallo vertical de ±12 dp, umbral de acción de 72 dp y desplazamiento visual limitado. El desplazamiento horizontal gana solo si el movimiento es claramente horizontal; el vertical cancela el pan y deja scrollar la lista. | (a) `ReanimatedSwipeable` de gesture-handler: menos código, pero menos control del umbral y del conflicto con el scroll. (b) `LongPress` para acciones: no cumple el gesto pedido. Si en Android el pan compite con el scroll, se ajustará el fallo vertical o se usará `ReanimatedSwipeable` como respaldo. |
| **Canal de Android y primer plano** | Canal `recordatorios`, nombre “Recordatorios”, importancia `DEFAULT`, sonido por defecto y vibración. Se crea una vez antes de programar, solo en Android. En primer plano, el handler muestra banner y lista, con sonido y sin badge. | (a) Importancia `HIGH`: muestra heads-up, más intrusivo para tareas de estudio. (b) No mostrar en primer plano: el usuario podría perderse el recordatorio. (c) Crear el canal en cada programación: innecesario; se cachea la promesa. |
| **Fecha sin hora** | Mantener `aFecha()` como medianoche local. El formulario seguirá enviando ISO con hora. | (a) Interpretar fecha sin hora como fin del día: cambiaría también `estaVencida` y el orden, fuera de alcance. (b) Asumir 09:00: inventa una hora que el usuario no eligió. |
| **Orden de escritura y atomicidad** | Primero guardar/actualizar la tarea en SQLite; después programar; después persistir `notificacion_id` con una función específica del repositorio. Si programar falla, la tarea queda guardada, `notificacion_id` queda `null` y se muestra aviso. Si se programó pero falló la persistencia del id, se intenta cancelar la notificación recién creada para no dejar huérfanos. | (a) Programar antes de guardar: si la base falla, queda una notificación huérfana. (b) Usar una transacción con la API nativa: la programación no es transaccional con SQLite. La compensación explícita es suficiente para este alcance. |
| **Cancelar y reprogramar** | Al completar: cancelar y limpiar `notificacion_id`. Al volver a pendiente: reprogramar si la fecha es futura. Al eliminar: capturar el id, borrar la fila y cancelar. Al editar: cancelar el id anterior, reprogramar si sigue habiendo fecha futura y la tarea no está completada, y persistir el id nuevo. | (a) Solo cancelar al eliminar: dejaría recordatorios de tareas inexistentes. (b) No reprogramar al cambiar el título: el aviso mostraría texto viejo. (c) Bloquear la edición si falla la notificación: la sección 7 exige guardar aunque no haya permiso. |
| **`notificacion_id` en la entrada del formulario** | Hallazgo: hoy `entradaDesdeValores` envía `notificacion_id: null` y `actualizarTarea` lo escribe, borrando el id existente. Propuesta: retirar `notificacion_id` de `EntradaTarea` (dato de usuario) y conservarlo en el servicio de actualización; el id solo lo maneja el servicio de recordatorios. | (a) Conservarlo en la entrada y que la pantalla lo reenvíe: la pantalla tendría que conocer un detalle de persistencia. (b) Dejarlo como está: cualquier edición rompería el recordatorio. |
| **Doble toque para editar** | No implementarlo. | VoiceOver y TalkBack usan doble toque para activar el elemento enfocado; un doble toque propio compite con el lector de pantalla. Ya hay dos gestos obligatorios y el botón “Editar”. Si se pidiera, habría que hacerlo sobre el título con mucha precaución y probarlo con lector. |
| **Reordenar por arrastre** | No proponerlo. | Para persistir el orden habría que añadir una columna `orden` al esquema de la sección 8 y sincronizarla; eso cambia API, Firestore y migraciones, todo fuera de alcance. Un orden solo en memoria no cumpliría RF-03 ni la sincronización. |
| **Contenido del aviso** | Título: “Recordatorio: <título>”. Cuerpo: “Vence el <fecha y hora local>”. `data` solo con `tareaId`. Sonido por defecto. | (a) Sin cuerpo: menos información. (b) Incluir datos personales adicionales: innecesario. El toque en la notificación no navega en este hito; queda fuera de alcance. |

---

## 4. Fases, archivos, capas y primera prueba en rojo

### Fase 0 — Verificación técnica y base de pruebas

**Objetivo:** confirmar supuestos antes de escribir lógica.

- Verificar en dispositivo físico: notificaciones locales, canal Android, permiso en iOS/Android, gestos con Reanimated 4 y React Compiler, y limitaciones de Expo Go.
- Confirmar que `expo-notifications` no tiene `isAvailableAsync()` y que `Accelerometer.isAvailableAsync()` sí existe.
- Montar el setup de Jest para gesture-handler, Reanimated, notifications y sensors.

**Archivos previstos:**
- `jest.config.mjs`
- `jest.setup.ts` (nuevo)
- `package.json` solo si hace falta un script; no se espera.

**Primera prueba en rojo:** una prueba mínima de que `TareaItem` sigue renderizando dentro de `GestureHandlerRootView` con los mocks; debe fallar por el mock/setup faltante, no por lógica de negocio.

**Criterio de aceptación:** `npm test` sigue en verde y el setup no oculta errores reales.

---

### Fase 1 — Lógica pura de recordatorios, deshacer y sacudida

**Capa:** dominio/servicios, sin Expo, sin SQL, sin React.

**Archivos nuevos:**
- `src/services/recordatorio.ts`
- `src/services/deshacer.ts` (o integrado en el proveedor si queda pequeño; prefiero separarlo para probarlo puro)
- `src/services/sacudida.ts`
- `src/services/__tests__/recordatorio.test.ts`
- `src/services/__tests__/deshacer.test.ts`
- `src/services/__tests__/sacudida.test.ts`

**Primera prueba en rojo:** `recordatorio.test.ts` falla con `Cannot find module '../recordatorio'`; después, las aserciones de disparo a 30 min, caso límite y fecha pasada.

**Criterios:**
- `calcularDisparo(venceEn, ahora)` devuelve: programado, inmediato o ninguno.
- Tarea para dentro de una hora → disparo 30 minutos antes.
- Tarea para dentro de 20 minutos → inmediato.
- Tarea vencida → ninguno.
- Fecha inválida o `null` → ninguno.
- `sumarUnDia` y las fechas existentes no cambian.
- La pila de deshacer tiene profundidad 1, reemplaza la anterior, devuelve la instantánea y se vacía al deshacer.
- `esSacudida` aplica umbral y enfriamiento sin depender de temporizadores reales.

---

### Fase 2 — Adaptador de notificaciones y persistencia del id

**Capas:** `src/services/` (adaptador de plataforma) y `src/repositories/` (SQL parametrizado).

**Archivos:**
- `src/services/notificaciones.ts` (nuevo; único lugar que importa `expo-notifications`)
- `src/services/__tests__/notificaciones.test.ts`
- `src/repositories/tarea.repositorio.ts` (añadir `actualizarNotificacion`)
- `src/repositories/__tests__/tarea.repositorio.test.ts`

**Primera prueba en rojo:**
- `notificaciones.test.ts`: falla porque el módulo no existe o porque no se llama al canal/trigger esperado.
- Repositorio: falla porque `actualizarNotificacion` no existe.

**Criterios:**
- `isAvailableAsync()` propio: web → `false`; nativo → comprobación real con `try/catch`.
- Permiso concedido/denegado/indeterminado se traduce a un estado de dominio.
- Programar usa trigger de tipo fecha con `vence - 30 min` y `channelId` en Android.
- Canal Android creado una sola vez.
- Cancelar llama a la API de Expo y no lanza si el id ya no existe.
- En web no se llama a APIs nativas.
- `actualizarNotificacion` ejecuta el `UPDATE` parametrizado exacto y devuelve si cambió la fila.
- La prueba verifica que el nombre de columna es exacto, sin repetir el problema de `id` como subcadena.

---

### Fase 3 — Servicio de orquestación

**Capa:** `src/services/`, compone reglas de tareas + notificador inyectable.

**Archivos:**
- `src/services/recordatorios.servicio.ts` (nuevo)
- `src/services/tareas.servicio.ts` (ajustar `actualizarTarea` para conservar el id; retirar `notificacion_id` de `EntradaTarea` si se aprueba)
- `src/services/__tests__/recordatorios.servicio.test.ts`
- `src/services/__tests__/tareas.servicio.test.ts` (ajustes)

**Primera prueba en rojo:** crear una tarea con fecha y comprobar que se llama al notificador y que se persiste el id; completo/elimino y compruebo la cancelación; edito la fecha y compruebo cancelación + nueva programación. La prueba falla porque el servicio no existe o no llama al notificador.

**Criterios:**
- `crearConRecordatorio`: guarda, pide permiso si hace falta, programa y persiste el id; si se deniega, guarda y devuelve aviso.
- `actualizarConRecordatorio`: conserva el id existente hasta cancelar; reprograma si procede.
- `alternarConRecordatorio`: completa → cancela y limpia; desmarca → reprograma si la fecha es futura.
- `posponerConRecordatorio`: pospone, cancela la anterior y reprograma; sin fecha devuelve `false` + aviso.
- `eliminarConRecordatorio`: borra y cancela; un fallo de cancelación no impide borrar.
- `restaurarTarea`: aplica la instantánea y recalcula la notificación.
- Ninguna función de esta capa llama a `fetch` ni a una pantalla.

---

### Fase 4 — Proveedor

**Capa:** `src/providers/`, única puerta de las pantallas a los servicios.

**Archivos:**
- `src/providers/proveedor-tareas.tsx`
- `src/providers/__tests__/proveedor-tareas.test.tsx`
- Posible extracción a `src/providers/use-acciones-tareas.ts` si el archivo se acerca a 300 líneas.

**Primera prueba en rojo:** prueba del proveedor que crea una tarea con fecha y espera que aparezca en el estado, que se llame al servicio de recordatorios y que se exponga el aviso. También una prueba de deshacer que espera restaurar la tarea anterior.

**Criterios:**
- `crear`, `actualizar`, `alternar`, `posponer`, `eliminar` y `deshacer` usan la capa de servicios.
- El proveedor expone `aviso` y `descartarAviso`.
- El proveedor expone `puedeDeshacer` y `deshacer`.
- El estado local se actualiza con la tarea devuelta por el servicio, incluido el `notificacion_id`.
- Ninguna pantalla necesita saber si hubo permiso o si se programó una notificación.

---

### Fase 5 — Gestos y botones accesibles

**Capas:** `src/components/` y pantallas.

**Archivos:**
- `src/components/tarea-deslizable.tsx` (nuevo; gesture-handler + Reanimated)
- `src/components/tarea-item.tsx` (botón “Posponer un día”)
- `src/components/lista-tareas.tsx` (pasar `onPosponer`)
- `src/components/aviso-tareas.tsx` y/o `src/components/barra-deshacer.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/hechas.tsx`
- `app/_layout.tsx` (montar el aviso global y configurar el handler)
- Pruebas en `src/components/__tests__/`

**Primera prueba en rojo:** `tarea-item.test.tsx` falla porque no existe el botón con etiqueta “Posponer un día: <título>”; la prueba del componente deslizable falla porque el gesto no existe o no llama al callback.

**Criterios:**
- Deslizar a la derecha completa/desmarca; deslizar a la izquierda pospone un día.
- Cada gesto tiene botón equivalente con `accessibilityLabel`:
  - “Marcar como completada: <título>”
  - “Posponer un día: <título>”
  - “Editar tarea: <título>”
  - “Deshacer última acción”
- El fondo del swipe es decorativo (`accessible={false}`); las acciones reales están en botones.
- El scroll vertical de `SectionList` sigue funcionando; el gesto horizontal no secuestra el scroll.
- El botón “Deshacer” está visible y accesible; si no hay acción, queda deshabilitado con `accessibilityState`.
- El banner de aviso usa `accessibilityRole="alert"` y se puede cerrar con un botón.
- Las pantallas no importan `expo-notifications`, `expo-sqlite` ni el repositorio.

---

### Fase 6 — Acelerómetro y sacudida

**Capas:** `src/sensors/` (hook) + pantalla que lo activa.

**Archivos:**
- `src/sensors/use-sacudida.ts` (nuevo)
- `src/components/barra-deshacer.tsx` o el control del interruptor
- `app/(tabs)/index.tsx`
- `src/sensors/__tests__/use-sacudida.test.ts`
- Posible `src/services/__tests__/sacudida.test.ts` ya cubierto en Fase 1.

**Primera prueba en rojo:** el hook no existe o no llama a `isAvailableAsync`; la prueba de sensor no disponible falla porque se intenta suscribir igualmente.

**Criterios:**
- `isAvailableAsync()` antes de suscribirse.
- Permiso de movimiento solo al encender “Agitar para deshacer”.
- Si el sensor no existe, el interruptor queda deshabilitado, se muestra un aviso y la app sigue funcionando.
- Si el permiso se deniega, no se rompe; el botón “Deshacer” sigue funcionando.
- La suscripción se cancela con `subscription.remove()` al salir de la pantalla o al apagar el interruptor.
- La sacudida llama a `deshacer` como máximo una vez por enfriamiento.
- La app no usa `console.log` ni muestra errores técnicos al usuario.

---

### Fase 7 — Configuración, documentación y cierre

**Archivos:**
- `app.json`: añadir los plugins `expo-notifications` y `expo-sensors` con el texto de permiso de movimiento. No añadir `expo-location`.
- `jest.config.mjs`: setup y cobertura.
- `ia/BITACORA.md`: propósito, evidencia, validación y decisiones del hito.
- `README.md` solo si hace falta aclarar las capacidades ya instaladas; no se justifican dependencias nuevas porque no las hay.

**Primera verificación:** `npm run build` debe seguir funcionando con las nuevas importaciones. Si falla por un módulo nativo en web, se añade un shim `.web.ts` siguiendo el patrón existente de `src/db/abrir.web.ts`.

**Criterio de aceptación:** `npm run check`, `npm run check:ia` y `npm run build` en verde.

---

## 5. Diseño de pruebas Jest + React Native Testing Library

### 5.1 Setup y mocks

**`jest.setup.ts` propuesto:**

- Registrar `react-native-gesture-handler/jestSetup`.
- Mock global de `react-native-reanimated` con su mock oficial.
- Mock global de `expo-notifications` con: `setNotificationHandler`, `getPermissionsAsync`, `requestPermissionsAsync`, `scheduleNotificationAsync`, `cancelScheduledNotificationAsync`, `setNotificationChannelAsync`, enums usados (`ScheduledTriggerInputTypes.DATE`, `AndroidImportance.DEFAULT`).
- Mock global de `expo-sensors`:
  - `Accelerometer.isAvailableAsync`
  - `Accelerometer.getPermissionsAsync`
  - `Accelerometer.requestPermissionsAsync`
  - `Accelerometer.setUpdateInterval`
  - `Accelerometer.addListener`, que devuelve `{ remove }` y permite capturar el listener.
- No mockear la lógica de negocio ni el repositorio; esos se prueban con dobles propios.

**`jest.config.mjs`:**

- Añadir `setupFilesAfterEnv` con `jest.setup.ts`.
- Si gesture-handler exige `setupFiles`, añadirlo y comprobar que Jest conserva el `setupFiles` de `jest-expo`; si no lo conserva, mover el registro de mocks a `setupFilesAfterEnv`.
- Valorar `resolver: "react-native-reanimated/jest/resolver.js"` solo si aparecen errores de worklets; con el mock oficial no debería hacer falta.
- No tocar `transformIgnorePatterns` salvo que aparezca un error de transformación; el preset actual ya cubre paquetes `react-native*`.
- Ampliar `collectCoverageFrom` con `src/sensors/**/*.ts` si el hook se prueba; mantener los umbrales de 80 % de `src/services/`, `src/db/` y `src/repositories/`.
- No añadir `any` en las pruebas: usar `jest.mocked`, tipos de los módulos y funciones auxiliares tipadas.

### 5.2 Suites y casos

**`recordatorio.test.ts` (puro):**
- Tarea para dentro de una hora → disparo a los 30 minutos.
- Tarea para dentro de 31 minutos → disparo dentro de 1 minuto.
- Tarea para dentro de 30 minutos exactos → caso límite documentado.
- Tarea para dentro de 20 minutos → inmediato.
- Tarea vencida → ninguno.
- Fecha inválida → ninguno.
- Fecha `YYYY-MM-DD` → comportamiento documentado.
- Contenido del mensaje con fecha y hora local.

**`deshacer.test.ts` (puro):**
- Guardar una instantánea y recuperarla.
- Una nueva acción reemplaza la anterior.
- Deshacer vacía la pila.
- No se guarda una acción cuando posponer falla.

**`sacudida.test.ts` (puro):**
- Magnitud por debajo del umbral no dispara.
- Magnitud por encima dispara.
- Segunda muestra dentro del enfriamiento no dispara.
- Muestra después del enfriamiento vuelve a disparar.

**`notificaciones.test.ts` (adaptador con mocks):**
- `isAvailableAsync()` devuelve `false` en web.
- `isAvailableAsync()` devuelve `false` si la comprobación nativa lanza.
- Permiso concedido → programa.
- Permiso denegado → no programa y devuelve estado denegado.
- Permiso indeterminado → pide permiso una vez.
- Trigger exacto de `vence - 30 min`.
- En Android se crea el canal `recordatorios` una vez y se pasa su id.
- En iOS no se crea canal.
- Cancelar llama a `cancelScheduledNotificationAsync`.
- Un fallo de programación no propaga una excepción no controlada.
- `setNotificationHandler` configura banner, lista y sonido, sin badge.

**`tarea.repositorio.test.ts`:**
- `actualizarNotificacion` ejecuta el `UPDATE` correcto con `[id, notificacionId]` o el orden exacto que se defina.
- Devuelve `true/false` según `changes`.
- No modifica otras columnas.

**`recordatorios.servicio.test.ts` (base falsa + notificador falso):**
- Crear con fecha: programa y persiste el id.
- Crear sin fecha: no programa.
- Crear con vencimiento a menos de 30 min: programa inmediato.
- Crear con permiso denegado: guarda la tarea, no programa y devuelve aviso.
- Crear con error de programación: guarda, deja `notificacion_id` nulo y avisa.
- Completar: cancela y limpia el id.
- Volver a pendiente: reprograma.
- Eliminar: cancela y elimina.
- Editar fecha: cancela la anterior, programa la nueva y persiste el id nuevo.
- Editar título: reprograma si se decide así.
- Posponer: cancela y reprograma con la fecha nueva.
- Posponer sin fecha: devuelve `false` y aviso, sin SQL.
- Deshacer: restaura la instantánea y recalcula la notificación.
- Restaurar una tarea que ya no existe: devuelve error controlado.

**`proveedor-tareas.test.tsx`:**
- Crear actualiza el estado y expone el aviso de permiso denegado.
- Completar/posponer actualiza el estado.
- Deshacer restaura la tarea y limpia `puedeDeshacer`.
- El aviso se muestra con `accessibilityRole="alert"` y se puede cerrar.
- La prueba existente de eliminación sigue pasando.

**`tarea-item.test.tsx`:**
- Etiquetas accesibles de completar, posponer y editar.
- El botón de posponer llama al callback correcto.
- La tarea vencida conserva su estilo de alerta.

**`tarea-deslizable.test.tsx`:**
- Renderiza los botones equivalentes.
- La función pura de decisión de umbral se prueba aparte; si se puede, se usa `fireGestureHandler` de gesture-handler para simular el pan.
- No se prueba la animación como tal; se prueba que el callback se dispare por encima del umbral y no por debajo.

**`use-sacudida.test.ts`:**
- Sensor no disponible: no llama a `addListener`, no lanza.
- Permiso denegado: no se suscribe y devuelve estado controlado.
- Sensor disponible: se suscribe, se cancela con `remove()` al desmontar.
- Una emisión por encima del umbral llama a `onSacudir`.
- Varias emisiones dentro del enfriamiento llaman una sola vez.
- Apagar el interruptor cancela la suscripción.

**`notificaciones.web` o comprobación de build:**
- Si se crea un shim web, una prueba directa confirma que no llama a APIs nativas.
- Si se opta por un solo adaptador con guardas, la prueba de `isAvailableAsync` en web cubre el caso.

---

## 6. Matriz manual

| Caso | iOS físico | Android físico | Expo Go | Development build | Web (`npm run build`) |
|---|---|---|---|---|---|
| Permiso de notificaciones al crear tarea con fecha | Sí | Sí | Verificar | Sí | No aplica |
| Aviso si se deniega y tarea guardada | Sí | Sí | Verificar | Sí | No aplica |
| Recordatorio 30 min antes (tarea +1 h) | Sí | Sí | Verificar | Sí | No aplica |
| Vencimiento a menos de 30 min (tarea +20 min) | Sí | Sí | Verificar | Sí | No aplica |
| Cancelar al completar | Sí | Sí | Verificar | Sí | No aplica |
| Cancelar al eliminar | Sí | Sí | Verificar | Sí | No aplica |
| Reprogramar al editar fecha | Sí | Sí | Verificar | Sí | No aplica |
| Canal Android “Recordatorios” en ajustes | No aplica | Sí | Verificar | Sí | No aplica |
| Notificación en primer plano | Sí | Sí | Verificar | Sí | No aplica |
| Notificación en segundo plano y app cerrada | Sí | Sí | Limitado | Sí | No aplica |
| Swipe derecha/izquierda vs scroll vertical | Sí | Sí | Sí | Sí | Opcional con ratón |
| Botones equivalentes con VoiceOver/TalkBack | Sí | Sí | Sí | Sí | Opcional |
| Deshacer tras sacudida | Sí | Sí | Depende del sensor | Sí | No aplica |
| Sensor no disponible o permiso denegado | Simulador | Emulador | Sí | Sí | Sí |
| `npm run build` sin errores | — | — | — | — | Sí |

**Verificación rápida de la notificación:** crear una tarea que venza en 31 minutos. El recordatorio debe dispararse aproximadamente en 1 minuto. Para la aceptación de “dentro de una hora”, el disparo debe quedar a los 30 minutos; puede esperarse o comprobarse en la lista de notificaciones programadas del sistema.

**Cómo comprobar que el build web no se rompe:**

- Ejecutar `npm run build` después de cada fase que añada importaciones nativas.
- Confirmar que `expo export --platform web` termina con código 0 y genera `dist/`.
- Abrir la versión web: la app debe cargar sin llamar a APIs de notificaciones ni sensores.
- Si Metro falla por un módulo nativo, crear shims `.web.ts` como ya se hizo con `abrir.web.ts`.
- No introducir llamadas nativas en el nivel superior de módulos que se importen desde `app/_layout.tsx`.

**Expo Go vs development build:** Expo Go sirve para gestos, botones y UI. Para validar canal Android, icono, comportamiento en segundo plano y permisos exactos, usar development build. El APK queda fuera de este hito, pero el development build sí es necesario para la matriz.

---

## 7. Riesgos y mitigación

| Riesgo | Impacto | Mitigación |
|---|---|---|
| `expo-notifications` no tiene `isAvailableAsync()` | No se cumple literalmente la sección 5 | Envoltorio propio documentado; comprobación real con `try/catch` y `Platform` |
| Permiso de notificaciones denegado | No hay recordatorio | La tarea se guarda igual; aviso global accesible; no se programa nada |
| Android 12+ no entrega exactamente a la hora | Aviso tardío | Aceptar “best effort”; documentar; no pedir alarmas exactas en este hito |
| Expo Go limita notificaciones locales/canal | Falsa sensación de que funciona | Validar en development build; documentar la diferencia |
| Swipe compite con el scroll de `SectionList` | La lista no se puede desplazar | `activeOffsetX`/`failOffsetY`, umbral alto y prueba manual en ambos sistemas; respaldo con `ReanimatedSwipeable` |
| Reanimated 4 + React Compiler | Errores de runtime o de build | Probar temprano en dispositivo y build web; si hay conflicto, aislar el componente o evaluar desactivar el compilador solo con aprobación |
| Mocks de módulos nativos en Jest | Pruebas frágiles o que ocultan fallos | Mocks globales mínimos; pruebas de adaptador y de lógica separadas; `jest.mocked` tipado |
| Notificación huérfana si falla SQLite después de programar | Aviso de una tarea inexistente | Guardar primero, programar después y compensar cancelando si falla la persistencia del id |
| Carreras entre acciones rápidas | Estados inconsistentes | Mantener una sola acción de deshacer y actualizar el estado con la tarea devuelta; no prometer concurrencia transaccional |
| Sacudida con falsos positivos o batería | Deshacer accidental o consumo | Umbral 2.2 g, enfriamiento de 1 s, suscripción solo con pantalla enfocada e interruptor activo |
| Lector de pantalla y doble toque | Conflicto de accesibilidad | No implementar doble toque; mantener botones y etiquetas |
| `notificacion_id` termina en Firestore | Fuga de detalle local | No tocar la API; documentar que el serializador de sincronización debe excluirlo |
| Build web por imports nativos | Rompe `npm run build` | Guardas de plataforma, shims `.web.ts` si hace falta y build en cada fase |

---

## 8. Plan de commits

Propuesta de commits pequeños, uno por cambio coherente:

1. `test(recordatorios): define el cálculo del disparo y los casos límite`
2. `feat(notificaciones): adapta expo-notifications con canal y permisos`
3. `feat(tareas): programa, cancela y reprograma recordatorios locales`
4. `feat(ui): añade deslizar para completar y posponer con botones accesibles`
5. `feat(sensores): deshacer al agitar con alternativa por botón`
6. `chore(config): declara plugins de notificaciones y sensores`
7. `docs(ia): registra propósito, evidencia y decisiones del hito 4`

Cada commit debe dejar `npm run check` en verde. El commit y el push los hace el humano.

---

## 9. Checklist de terminado

- [ ] `npm run check` en verde: typecheck, ESLint, Prettier y Jest con cobertura.
- [ ] `npm run check:ia` en verde (23/23 o más, sin relajar reglas).
- [ ] `npm run build` en verde.
- [ ] Cobertura ≥ 80 % en `src/services/`, `src/db/`, `src/repositories/` y, si se incluye, `src/sensors/`.
- [ ] Sin `any`, `@ts-ignore`, `@ts-nocheck`, reglas desactivadas ni `console.log`.
- [ ] Funciones ≤ 50 líneas, complejidad ≤ 10, anidación ≤ 3 y archivos ≤ 300 líneas.
- [ ] Las pantallas no escriben SQL, no llaman a `fetch` y no importan `expo-notifications` directamente.
- [ ] `notificacion_id` se persiste solo en SQLite; no se envía a la API ni a Firestore.
- [ ] Dos gestos funcionando y cada uno con botón equivalente y `accessibilityLabel`.
- [ ] El botón “Deshacer” está visible y accesible; la sacudida funciona con interruptor.
- [ ] La app no se rompe si el acelerómetro no existe, si el permiso se deniega o si las notificaciones no están disponibles.
- [ ] El canal Android y el comportamiento en primer plano están verificados en development build.
- [ ] La matriz manual iOS/Android está completada y anotada.
- [ ] `app.json` declara solo los permisos/plugins necesarios; no se añade `expo-location`.
- [ ] `ia/BITACORA.md` actualizada con propósito, evidencia, validación y decisiones.
- [ ] Diff revisado completo; commits con conventional commits; commit y push a cargo del humano.
- [ ] Sin secretos, sin `.env`, sin credenciales y sin cambios fuera del repositorio.

---

## Criterios de aceptación del hito, mapeados

1. **Tarea para dentro de una hora → notificación 30 minutos antes:** `calcularDisparo` puro + adaptador + prueba manual en dispositivo.
2. **Completar la tarea → se cancela la notificación:** `alternarConRecordatorio` + mock de cancelación + prueba manual.
3. **Permiso denegado → la tarea se guarda y se muestra aviso:** servicio que guarda primero, no programa, devuelve aviso; UI con `accessibilityRole="alert"`; prueba de servicio y de proveedor.
4. **Dos gestos mínimos:** swipe a la derecha para completar y a la izquierda para posponer, con botones equivalentes.
5. **Sensor principal:** notificaciones locales programadas y canceladas con `expo-notifications`.
6. **Segundo sensor:** acelerómetro para deshacer, con botón alternativo y tolerancia a sensor ausente.
7. **Sin cambios de esquema ni de API:** `notificacion_id` sigue siendo local; no se añade `orden`, ni repetición, ni ubicación.