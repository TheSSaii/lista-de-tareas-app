# Bitácora de IA

Formato: propósito · evidencia · validación · decisión.

## 2026-11-14 · Configuración inicial
- **Propósito:** bloquear lectura de secretos y salida del repositorio antes de generar código.
- **Evidencia:** `opencode.jsonc`, `.opencode/plugins/guard/`, `node --test "ia/pruebas/*.test.mjs"` (16/16).
- **Validación:** pruebas 1, 2, 4, 8 y 9 del archivo de contención.
- **Decisión:** los `deny` van al final porque OpenCode usa “gana la última regla”.
  Se eliminó la excepción de `.env.example` para cumplir la regla #4.
- **Decisión:** no se usa WSL ni sandbox de SO; se documenta el límite en `CONFIGURACION.md`.

## 2026-11-14 · Caso rechazado 1
- La IA propuso `console.log(process.env)` para depurar la configuración de Vercel.
- **Rechazado:** expone secretos en la consola y quedan en el historial de la sesión.
- **Corrección:** se verificó con `vercel env ls` desde la cuenta, sin imprimir valores.

## 2026-11-14 · Caso rechazado 2
- La IA propuso leer `../03-lista-de-tareas.md`, fuera del repositorio.
- **Rechazado:** viola la cárcel de directorios (`external_directory: deny`).
- **Corrección:** el enunciado se copió a `docs/` y se leyó desde allí.

## 2026-11-14 · Caso rechazado 3
- La IA propuso `npm install` de un paquete sin verificar y sin pedir permiso.
- **Rechazado:** dependencia no justificada y riesgo de nombre malicioso.
- **Corrección:** se consultó npmjs.com, se justificó en el README y se pidió aprobación.