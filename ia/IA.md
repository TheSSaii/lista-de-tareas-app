# Configuración de IA del repositorio

| Archivo | Qué contiene |
|---|---|
| `AGENTS.md` | Reglas del proyecto para la IA (≤ 100 líneas) |
| `opencode.jsonc` | Permisos, cárcel de directorios, red y shell |
| `.opencode/agents/revisor.md` | Subagente revisor de solo lectura |
| `.opencode/plugins/guard/` | Hook previo a cada herramienta + auditoría |
| `ia/CONFIGURACION.md` | Riesgo que cubre cada barrera, límites y decisiones |
| `ia/PRUEBAS-CONTENCION.md` | 13 pruebas obligatorias y su resultado |
| `ia/pruebas/politica.test.mjs` | 23 pruebas automáticas del hook |
| `ia/BITACORA.md` | Propósito, evidencia, validación, decisión |
| `ia/logs/` | Auditoría de herramientas ejecutadas (no versionada) |

## Reproducir

```bash
node --test "ia/pruebas/*.test.mjs"