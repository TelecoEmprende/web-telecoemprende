import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RegistrationForm } from "./RegistrationForm";

const submitRegistration = vi.fn();

vi.mock("../../api/public", () => ({
  submitRegistration: (...args: unknown[]) => submitRegistration(...args),
}));

describe("RegistrationForm", () => {
  it("shows inline validation errors before calling the API", async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);

    await user.click(
      screen.getByRole("button", { name: /confirmar registro/i }),
    );

    expect(await screen.findAllByText("Completa este campo.")).toHaveLength(4);
    expect(
      screen.getByText("Debes aceptar la politica de privacidad."),
    ).toBeInTheDocument();
    expect(submitRegistration).not.toHaveBeenCalled();
  });

  it("submits successfully and shows the success banner", async () => {
    submitRegistration.mockResolvedValueOnce({
      ok: true,
      message: "Registro completado.",
    });

    const user = userEvent.setup();
    render(<RegistrationForm />);

    await user.type(screen.getByLabelText("Nombre"), "Juan");
    await user.type(screen.getByLabelText("Apellidos"), "Perez");
    await user.type(
      screen.getByLabelText("Estudios / Procedencia"),
      "ETSIT UPM",
    );
    await user.type(
      screen.getByLabelText("Correo electronico"),
      "juan@example.com",
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: /confirmar registro/i }),
    );

    expect(await screen.findByText("Registro completado.")).toBeInTheDocument();
    expect(submitRegistration).toHaveBeenCalledWith({
      nombre: "Juan",
      apellidos: "Perez",
      estudios: "ETSIT UPM",
      email: "juan@example.com",
      privacidad: true,
      telefono_oculto: "",
    });
  });
});
