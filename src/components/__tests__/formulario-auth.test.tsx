import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import { FormularioAuth } from "../formulario-auth";

describe("FormularioAuth", () => {
  it("muestra errores accesibles y no envía con campos inválidos", async () => {
    const onEnviar = jest.fn();
    const { getByLabelText, getAllByRole } = await render(
      <FormularioAuth modo="login" cargando={false} errorGeneral={null} onEnviar={onEnviar} />,
    );

    await fireEvent.changeText(getByLabelText("Correo electrónico"), "sin-arroba");
    await fireEvent.changeText(getByLabelText("Contraseña"), "corta");
    await fireEvent.press(getByLabelText("Iniciar sesión"));

    expect(onEnviar).not.toHaveBeenCalled();
    expect(getAllByRole("alert")).toHaveLength(2);
  });

  it("envía correo sin espacios y contraseña válida", async () => {
    const onEnviar = jest.fn();
    const { getByLabelText } = await render(
      <FormularioAuth modo="registro" cargando={false} errorGeneral={null} onEnviar={onEnviar} />,
    );

    await fireEvent.changeText(getByLabelText("Correo electrónico"), " persona@ejemplo.test ");
    await fireEvent.changeText(getByLabelText("Contraseña"), "contrasena");
    await fireEvent.press(getByLabelText("Crear cuenta"));

    expect(onEnviar).toHaveBeenCalledWith({
      email: "persona@ejemplo.test",
      password: "contrasena",
    });
  });

  it("muestra el error general del servidor", async () => {
    const { getByText } = await render(
      <FormularioAuth
        modo="login"
        cargando={false}
        errorGeneral="Ese correo ya está registrado."
        onEnviar={jest.fn()}
      />,
    );

    expect(getByText("Ese correo ya está registrado.")).toBeTruthy();
  });
});
