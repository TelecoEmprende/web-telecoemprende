import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { RegistrationForm } from "./RegistrationForm";
import { ThankYouPage } from "../../routes/ThankYouPage";

const submitRegistration = vi.fn();

vi.mock("../../api/public", () => ({
  submitRegistration: (...args: unknown[]) => submitRegistration(...args),
}));

describe("RegistrationForm", () => {
  it("shows inline validation errors before calling the API", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RegistrationForm />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: /confirmar registro/i }),
    );

    expect(await screen.findAllByText("Completa este campo.")).toHaveLength(4);
    expect(
      screen.getByText("Debes aceptar la política de privacidad."),
    ).toBeInTheDocument();
    expect(submitRegistration).not.toHaveBeenCalled();
  });

  it("submits successfully and redirects to the thank-you page", async () => {
    submitRegistration.mockResolvedValueOnce({
      ok: true,
      message: "Registro completado.",
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<RegistrationForm />} />
          <Route path="/gracias" element={<ThankYouPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Nombre"), "Juan");
    await user.type(screen.getByLabelText("Apellidos"), "Perez");
    await user.type(
      screen.getByLabelText("Estudios / Procedencia"),
      "ETSIT UPM",
    );
    await user.type(
      screen.getByLabelText("Correo electrónico"),
      "juan@example.com",
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: /confirmar registro/i }),
    );

    expect(await screen.findByText("Gracias, Juan.")).toBeInTheDocument();
    expect(
      screen.getByText("Estamos deseando verte en Teleco Builders 2026. Tu plaza ha quedado registrada correctamente."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Lo recibirás en juan@example.com."),
    ).toBeInTheDocument();
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
