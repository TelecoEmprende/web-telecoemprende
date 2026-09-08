import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminPage } from "./AdminPage";

const getAdminSession = vi.fn();
const getAdminRegistrations = vi.fn();
const loginAdmin = vi.fn();
const logoutAdmin = vi.fn();
const deleteRegistration = vi.fn();
const updateRegistration = vi.fn();
const updateRegistrationEstado = vi.fn();

vi.mock("../api/admin", () => ({
  getAdminSession: (...args: unknown[]) => getAdminSession(...args),
  getAdminRegistrations: (...args: unknown[]) => getAdminRegistrations(...args),
  loginAdmin: (...args: unknown[]) => loginAdmin(...args),
  logoutAdmin: (...args: unknown[]) => logoutAdmin(...args),
  deleteRegistration: (...args: unknown[]) => deleteRegistration(...args),
  updateRegistration: (...args: unknown[]) => updateRegistration(...args),
  updateRegistrationEstado: (...args: unknown[]) => updateRegistrationEstado(...args),
}));

const REGISTRO = {
  id: 1,
  nombre: "Juan",
  apellidos: "Perez",
  estudios: "Grado - GIST",
  email: "juan@example.com",
  drive_link: "https://drive.google.com/drive/folders/abc123",
  privacidad: "Sí",
  fecha: "2026-04-16 11:00:00",
  evento: "telecoemprende-2026-27",
  estado: "pendiente",
  notificado: false,
};

async function loginYVerTabla() {
  getAdminSession.mockResolvedValueOnce({ ok: true, authenticated: true });
  getAdminRegistrations.mockResolvedValueOnce({
    ok: true,
    total: 1,
    eventos: ["telecoemprende-2026-27"],
    registros: [REGISTRO],
  });

  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  );
  await screen.findByText("juan@example.com");
  return user;
}

describe("AdminPage", () => {
  beforeEach(() => {
    getAdminSession.mockReset();
    getAdminRegistrations.mockReset();
    loginAdmin.mockReset();
    logoutAdmin.mockReset();
    deleteRegistration.mockReset();
    updateRegistration.mockReset();
    updateRegistrationEstado.mockReset();
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
    loginAdmin.mockResolvedValueOnce({ ok: true, message: "Sesión iniciada." });
    getAdminRegistrations.mockResolvedValueOnce({
      ok: true,
      total: 1,
      eventos: ["telecoemprende-2026-27"],
      registros: [
        {
          id: 1,
          nombre: "Juan",
          apellidos: "Perez",
          estudios: "Grado - GIST",
          email: "juan@example.com",
          drive_link: "https://drive.google.com/drive/folders/abc123",
          privacidad: "Sí",
          fecha: "2026-04-16 11:00:00",
          evento: "telecoemprende-2026-27",
          estado: "pendiente",
          notificado: false,
        },
      ],
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    );

    await user.type(await screen.findByLabelText("Contraseña"), "test-admin");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText("Inscripciones registradas")).toBeInTheDocument();
    expect(await screen.findByText("juan@example.com")).toBeInTheDocument();
    await waitFor(() => {
      expect(getAdminRegistrations).toHaveBeenCalledTimes(1);
    });
  });

  // Los controles de la fila pasaron de <input>/<select>/overlay propios a
  // Input/Select/AlertDialog de shadcn: esto comprueba que editar y borrar
  // siguen llegando a la API igual que antes.
  it("switches a row into edit mode with its values loaded", async () => {
    const user = await loginYVerTabla();

    await user.click(screen.getByTitle("Editar"));

    const fila = screen.getByDisplayValue("Juan").closest("tr") as HTMLElement;
    expect(within(fila).getByDisplayValue("juan@example.com")).toBeInTheDocument();
    // escuela, nivel y departamento son ahora Select de shadcn
    expect(within(fila).getAllByRole("combobox")).toHaveLength(3);
    expect(within(fila).getByText("Elige un departamento")).toBeInTheDocument();
  });

  it("asks for confirmation before deleting and then calls the API", async () => {
    deleteRegistration.mockResolvedValueOnce({ ok: true });
    const user = await loginYVerTabla();

    await user.click(screen.getByTitle("Eliminar"));

    const dialogo = await screen.findByRole("alertdialog");
    expect(dialogo).toHaveTextContent("¿Seguro que quieres eliminar este registro?");

    await user.click(within(dialogo).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => {
      expect(deleteRegistration).toHaveBeenCalledWith(1);
    });
    expect(screen.queryByText("juan@example.com")).not.toBeInTheDocument();
  });
});
