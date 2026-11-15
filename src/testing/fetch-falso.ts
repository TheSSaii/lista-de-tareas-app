import type { FetchHttp, PeticionHttp, RespuestaHttp } from "../api/http";

export type RespuestaFalsa = {
  status?: number;
  cuerpo?: unknown;
  texto?: string;
  errorRed?: boolean;
  nuncaResuelve?: boolean;
};

export type PeticionCapturada = {
  url: string;
  init: PeticionHttp;
};

export type FetchFalso = {
  fetch: FetchHttp;
  peticiones: PeticionCapturada[];
  encolar: (respuesta: RespuestaFalsa) => void;
};

function aRespuesta(respuesta: RespuestaFalsa): RespuestaHttp {
  return {
    status: respuesta.status ?? 200,
    text: async () => {
      if (respuesta.texto !== undefined) return respuesta.texto;
      if (respuesta.cuerpo === undefined) return "";
      return JSON.stringify(respuesta.cuerpo);
    },
  };
}

/**
 * `fetch` falso con cola. Las pruebas no tocan la red ni leen configuración real.
 * `nuncaResuelve` permite probar el timeout abortando con la señal.
 */
export function crearFetchFalso(iniciales: RespuestaFalsa[] = []): FetchFalso {
  const cola = [...iniciales];
  const peticiones: PeticionCapturada[] = [];

  const fetchFalso: FetchHttp = async (url, init) => {
    peticiones.push({ url, init });
    const respuesta = cola.shift() ?? { status: 200, cuerpo: {} };

    if (respuesta.errorRed === true) {
      throw new TypeError("Network request failed");
    }

    if (respuesta.nuncaResuelve === true) {
      return new Promise<RespuestaHttp>((_resolver, rechazar) => {
        init.signal?.addEventListener("abort", () => {
          rechazar(new Error("abortado"));
        });
      });
    }

    return aRespuesta(respuesta);
  };

  return {
    fetch: fetchFalso,
    peticiones,
    encolar: (respuesta) => {
      cola.push(respuesta);
    },
  };
}
