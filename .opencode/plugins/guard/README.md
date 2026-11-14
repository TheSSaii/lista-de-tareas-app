# guard

Hook previo a cada herramienta. Aplica `politica.mjs` sobre la acción y los recursos que
OpenCode ya resolvió (permisos) y convierte en `deny` lo que la política prohíbe.

- Capa 1: `opencode.jsonc` (permissions).
- Capa 2: `AGENTS.md` (orienta, no protege).
- Capa 3: este hook (programa).
- Capa 4: no hay secretos reales en el disco.
- Capa 5: registro en `ia/logs/acciones-ia.log`.

Límite conocido: OpenCode V2 no tiene sandbox de SO. Un proceso que ya corre (npm, jest)
tiene los permisos del usuario; por eso los secretos reales viven solo en Vercel.