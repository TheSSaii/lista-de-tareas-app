// Capa 3: se ejecuta antes de cada herramienta (equivalente a PreToolUse).
// Si la política dice deny, la acción no corre aunque el prompt insista.
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
// @ts-ignore -- archivo JS puro, probado con node --test
import { evaluar } from "./politica.mjs";

type Evento = {
  action: string;
  resources: readonly string[];
  effect: "allow" | "ask" | "deny";
  message?: string;
};

function resumen(input: unknown): string {
  if (!input || typeof input !== "object") return "";
  const i = input as Record<string, unknown>;
  const campo = i.command ?? i.filePath ?? i.path ?? i.pattern ?? i.url ?? "";
  return String(campo).slice(0, 200);
}

async function registrar(directorio: string, linea: string): Promise<void> {
  try {
    await mkdir(join(directorio, "ia/logs"), { recursive: true });
    const fecha = new Date().toISOString();
    await appendFile(join(directorio, "ia/logs/acciones-ia.log"), `${fecha} ${linea}\n`, "utf8");
  } catch {
    // El registro nunca debe tumbar una herramienta.
  }
}

export default {
  id: "guard",
  async setup(ctx: any) {
    const raiz: string = ctx.location.directory;
    await registrar(raiz, "arranque plugin=guard");

    await ctx.permission.hook("evaluate", (event: Evento) => {
      const veredicto = evaluar(event.action, event.resources, raiz);
      if (veredicto.efecto === "deny") {
        event.effect = "deny";
        event.message = `[guard:${veredicto.regla}] ${veredicto.motivo}`;
      } else if (veredicto.efecto === "ask") {
        event.effect = "ask";
        event.message = `[guard:${veredicto.regla}] ${veredicto.motivo}`;
      }
    });

    await ctx.tool.hook("execute.before", (event: any) => {
      void registrar(raiz, `tool=${event.tool} ${resumen(event.input)}`);
    });
  },
};