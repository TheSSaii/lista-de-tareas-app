import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { useState } from "react";

import { validarTarea, type ErroresTarea } from "../../services/tarea";
import { FormularioTarea, type ValoresFormulario } from "../formulario-tarea";

jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  default: () => null,
}));

const VALORES_INICIALES: ValoresFormulario = {
  titulo: "",
  descripcion: "",
  prioridad: null,
  venceEn: null,
};

function FormularioDePrueba() {
  const [valores, setValores] = useState<ValoresFormulario>(VALORES_INICIALES);
  const [errores, setErrores] = useState<ErroresTarea>({});

  function cambiar(cambios: Partial<ValoresFormulario>) {
    setValores((previos) => ({ ...previos, ...cambios }));
  }

  function guardar() {
    setErrores(
      validarTarea({
        titulo: valores.titulo,
        prioridad: valores.prioridad ?? 0,
        vence_en: null,
      }),
    );
  }

  return (
    <FormularioTarea
      valores={valores}
      errores={errores}
      onCambiar={cambiar}
      onGuardar={guardar}
      guardando={false}
    />
  );
}

describe("FormularioTarea", () => {
  it("muestra el error de título y de prioridad al guardar sin datos", async () => {
    const { getByLabelText, getByText } = await render(<FormularioDePrueba />);

    await fireEvent.press(getByLabelText("Guardar tarea"));

    expect(getByText("El título debe tener entre 3 y 100 caracteres.")).toBeTruthy();
    expect(getByText("La prioridad debe ser 1, 2 o 3.")).toBeTruthy();
  });
});
