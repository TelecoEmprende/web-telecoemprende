import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminPage } from "./AdminPage";

const getAdminSession = vi.fn();
const getAdminRegistrations = vi.fn();
const loginAdmin = vi.fn();
const logoutAdmin = vi.fn();

vi.mock("../api/admin", () => ({
  getAdminSession: (...args: unknown[]) => getAdminSession(...args),
  getAdminRegistrations: (...args: unknown[]) => getAdminRegistrations(...args),
  loginAdmin: (...args: unknown[]) => loginAdmin(...args),
  logoutAdmin: (...args: unknown[]) => logoutAdmin(...args),
}));

describe("AdminPage", () => {
  beforeEach(() => {
    getAdminSession.mockReset();
    getAdminRegistrations.mockReset();
    loginAdmin.mockReset();
    logoutAdmin.mockReset();
  });

  it("shows the login form when there is no authenticated session", async () => {
    getAdminSession.mockResolvedValueOnce({ ok: true, authenticated: false });

    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Acceso al panel")).toBeInTheDocument();
  });

  it("logs in and renders the registrations table", async () => {
    getAdminSession.mockResolvedValueOnce({ ok: true, authenticated: false });
    loginAdmin.mockResolvedValueOnce({ ok: true, message: "Sesion iniciada." });
    getAdminRegistrations.mockResolvedValueOnce({
      ok: true,
      total: 1,
      registros: [
        {
          nombre: "Juan",
          apellidos: "Perez",
          estudios: "ETSIT UPM",
          email: "juan@example.com",
          privacidad: "Sí",
          fecha: "2026-04-16 11:00:00",
        },
      ],
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Contrasena"), "test-admin");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText("Inscripciones registradas")).toBeInTheDocument();
    expect(await screen.findByText("juan@example.com")).toBeInTheDocument();
    await waitFor(() => {
      expect(getAdminRegistrations).toHaveBeenCalledTimes(1);
    });
  });
});
