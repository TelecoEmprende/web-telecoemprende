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
        <RegistrationForm evento="telecoemprende-2026-27" />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: /enviar solicitud de inscripción/i }),
    );

    expect(await screen.findAllByText("Completa este campo.")).toHaveLength(5);
    expect(
      screen.getByText("Selecciona tu titulación."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Debes aceptar la política de privacidad."),
    ).toBeInTheDocument();
    expect(submitRegistration).not.toHaveBeenCalled();
  });

  it("rejects a non-UPM email", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RegistrationForm evento="telecoemprende-2026-27" />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByLabelText(/correo electrónico institucional/i),
      "juan@gmail.com",
    );
    await user.click(
      screen.getByRole("button", { name: /enviar solicitud de inscripción/i }),
    );

    expect(
      await screen.findByText(
        "Usa tu correo institucional de la UPM (@alumnos.upm.es o @upm.es).",
      ),
    ).toBeInTheDocument();
    expect(submitRegistration).not.toHaveBeenCalled();
  });

  it("keeps the programa select disabled until an escuela is chosen", async () => {
    render(
      <MemoryRouter>
        <RegistrationForm evento="telecoemprende-2026-27" />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText<HTMLSelectElement>("Programa")).toBeDisabled();
  });

  it("offers grado options for the chosen escuela and máster options after switching", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RegistrationForm evento="telecoemprende-2026-27" />
      </MemoryRouter>,
    );

    await user.selectOptions(
      screen.getByLabelText("Escuela"),
      "ETS de Ingeniería y Sistemas de Telecomunicación (ETSIST)",
    );

    const select = screen.getByLabelText<HTMLSelectElement>("Programa");
    expect(select).toBeEnabled();
    expect(
      screen.getByRole("option", {
        name: "GIST · Grado en Ingeniería de Sistemas de Telecomunicación",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Máster" }));

    expect(
      screen.getByRole("option", {
        name: "MUIoT · M.U. en Internet de las Cosas (Compartido)",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", {
        name: "GIST · Grado en Ingeniería de Sistemas de Telecomunicación",
      }),
    ).not.toBeInTheDocument();
    expect(select.value).toBe("");
  });

  it("submits successfully and redirects to the thank-you page", async () => {
    submitRegistration.mockResolvedValueOnce({
      ok: true,
      message: "Solicitud enviada.",
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={<RegistrationForm evento="telecoemprende-2026-27" />}
          />
          <Route path="/gracias" element={<ThankYouPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Nombre"), "Juan");
    await user.type(screen.getByLabelText("Apellidos"), "Perez");
    await user.type(
      screen.getByLabelText(/correo electrónico institucional/i),
      "juan@alumnos.upm.es",
    );
    await user.type(screen.getByLabelText("Teléfono"), "600123456");
    await user.selectOptions(
      screen.getByLabelText("Escuela"),
      "ETS de Ingeniería y Sistemas de Telecomunicación (ETSIST)",
    );
    await user.selectOptions(
      screen.getByLabelText("Programa"),
      "Grado en Ingeniería de Sistemas de Telecomunicación",
    );
    await user.selectOptions(
      screen.getByLabelText(/a qué departamento/i),
      "Tech/Ingeniería",
    );
    await user.type(
      screen.getByLabelText(/enlace a tu cv y vídeo/i),
      "https://drive.google.com/drive/folders/abc123",
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: /enviar solicitud de inscripción/i }),
    );

    expect(await screen.findByText("Gracias, Juan.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Hemos recibido tu solicitud para unirte a TelecoEmprende 2026/27. La revisaremos y te escribiremos con la resolución.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Lo recibirás en juan@alumnos.upm.es."),
    ).toBeInTheDocument();
    expect(submitRegistration).toHaveBeenCalledWith({
      nombre: "Juan",
      apellidos: "Perez",
      escuela: "ETS de Ingeniería y Sistemas de Telecomunicación (ETSIST)",
      nivel: "Grado",
      estudios: "Grado - Grado en Ingeniería de Sistemas de Telecomunicación",
      email: "juan@alumnos.upm.es",
      telefono: "600123456",
      departamento: "Tech/Ingeniería",
      drive_link: "https://drive.google.com/drive/folders/abc123",
      privacidad: true,
      evento: "telecoemprende-2026-27",
      telefono_oculto: "",
    });
  });

  it("submits the full máster name in estudios when a máster is selected", async () => {
    submitRegistration.mockResolvedValueOnce({
      ok: true,
      message: "Solicitud enviada.",
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={<RegistrationForm evento="telecoemprende-2026-27" />}
          />
          <Route path="/gracias" element={<ThankYouPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Nombre"), "Lucía");
    await user.type(screen.getByLabelText("Apellidos"), "García");
    await user.type(
      screen.getByLabelText(/correo electrónico institucional/i),
      "lucia@upm.es",
    );
    await user.type(screen.getByLabelText("Teléfono"), "611234567");
    await user.selectOptions(
      screen.getByLabelText("Escuela"),
      "ETS de Ingenieros de Telecomunicación (ETSIT)",
    );
    await user.click(screen.getByRole("button", { name: "Máster" }));
    await user.selectOptions(
      screen.getByLabelText("Programa"),
      "M.U. en Ciberseguridad",
    );
    await user.selectOptions(
      screen.getByLabelText(/a qué departamento/i),
      "Marketing/Comms",
    );
    await user.type(
      screen.getByLabelText(/enlace a tu cv y vídeo/i),
      "https://drive.google.com/drive/folders/xyz789",
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: /enviar solicitud de inscripción/i }),
    );

    expect(await screen.findByText("Gracias, Lucía.")).toBeInTheDocument();
    expect(submitRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        estudios: "M.U. en Ciberseguridad",
        evento: "telecoemprende-2026-27",
      }),
    );
  });
});
