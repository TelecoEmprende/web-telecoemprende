import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InscripcionesView } from "./InscripcionesView";

const getAdminRegistrations = vi.fn();
const deleteRegistration = vi.fn();
const updateRegistration = vi.fn();
const updateRegistrationEstado = vi.fn();
const enviarNotificaciones = vi.fn();

vi.mock("../../api/admin", () => ({
  getAdminRegistrations: (...args: unknown[]) => getAdminRegistrations(...args),
  deleteRegistration: (...args: unknown[]) => deleteRegistration(...args),
  updateRegistration: (...args: unknown[]) => updateRegistration(...args),
  updateRegistrationEstado: (...args: unknown[]) => updateRegistrationEstado(...args),
  enviarNotificaciones: (...args: unknown[]) => enviarNotificaciones(...args),
  getEquipoAccesos: () => Promise.resolve({ ok: true, accesos: [] }),
}));

const REGISTRO = {
  id: 1,
  nombre: "Juan",
  apellidos: "Perez",
  escuela: "ETSIT",
  nivel: "Grado",
  estudios: "Grado - GIST",
  email: "juan@example.com",
  telefono: "600000000",
  departamento: "Tech/Ingeniería",
  drive_link: "https://drive.google.com/drive/folders/abc123",
  privacidad: "Sí",
  fecha: "2026-04-16 11:00:00",
  evento: "telecoemprende-2026-27",
  estado: "pendiente",
  notificado: false,
};

const NUNEZ = {
  ...REGISTRO,
  id: 2,
  nombre: "María",
  apellidos: "Núñez",
  email: "maria@example.com",
  escuela: "ETSII",
};

// Vive en el grupo Admin de /equipo; la sesión la comprueba EquipoPage.
function montar() {
  return render(
    <MemoryRouter initialEntries={["/equipo"]}>
      <InscripcionesView />
    </MemoryRouter>,
  );
}

async function verTabla(registros = [REGISTRO]) {
  getAdminRegistrations.mockResolvedValueOnce({
    ok: true,
    total: registros.length,
    eventos: ["telecoemprende-2026-27"],
    registros,
  });

  const user = userEvent.setup();
  montar();
  await screen.findByText("juan@example.com");
  return user;
}

describe("Inscripciones (grupo Admin de /equipo)", () => {
  beforeEach(() => {
    getAdminRegistrations.mockReset();
    deleteRegistration.mockReset();
    updateRegistration.mockReset();
    updateRegistrationEstado.mockReset();
    enviarNotificaciones.mockReset();
  });

  // La búsqueda ignora tildes y mayúsculas: "nunez" tiene que encontrar a
  // "Núñez", que es como se teclea de verdad.
  it("filters rows by the search box, ignoring accents", async () => {
    const user = await verTabla([REGISTRO, NUNEZ]);

    await user.type(screen.getByLabelText("Buscar inscripciones"), "nunez");

    await waitFor(() => {
      expect(screen.queryByText("juan@example.com")).not.toBeInTheDocument();
    });
    expect(screen.getByText("maria@example.com")).toBeInTheDocument();
    expect(screen.getByText(/de 2 inscripciones/)).toBeInTheDocument();
    // El botón de copiar trabaja sobre lo que se ve, no sobre todo.
    expect(screen.getByRole("button", { name: /copiar emails \(1\)/i })).toBeInTheDocument();
  });

  // Editar dejó de ser una fila que se convierte en formulario y pasó a ser
  // una ventana: la tabla solo lee.
  it("opens the edit dialog with the row values loaded", async () => {
    const user = await verTabla();

    await user.click(screen.getByTitle("Editar"));

    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByLabelText("Nombre")).toHaveValue("Juan");
    expect(within(dialogo).getByLabelText("Email")).toHaveValue("juan@example.com");
    // escuela, nivel y departamento siguen siendo Select de shadcn
    expect(within(dialogo).getAllByRole("combobox")).toHaveLength(3);
  });

  it("saves the dialog and sends the changes to the API", async () => {
    updateRegistration.mockResolvedValueOnce({ ok: true });
    const user = await verTabla();

    await user.click(screen.getByTitle("Editar"));
    const dialogo = await screen.findByRole("dialog");
    await user.clear(within(dialogo).getByLabelText("Teléfono"));
    await user.type(within(dialogo).getByLabelText("Teléfono"), "600111222");
    await user.click(within(dialogo).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(updateRegistration).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ telefono: "600111222", nombre: "Juan" }),
      );
    });
    // Cerrar la ventana deja la tabla con el valor nuevo, sin recargar.
    expect(await screen.findByText("600111222")).toBeInTheDocument();
  });

  it("refuses to save with an empty required field", async () => {
    const user = await verTabla();

    await user.click(screen.getByTitle("Editar"));
    const dialogo = await screen.findByRole("dialog");
    await user.clear(within(dialogo).getByLabelText("Email"));
    await user.click(within(dialogo).getByRole("button", { name: "Guardar cambios" }));

    expect(await within(dialogo).findByRole("alert")).toHaveTextContent(
      "Todos los campos son obligatorios.",
    );
    expect(updateRegistration).not.toHaveBeenCalled();
  });

  it("asks for confirmation before deleting and then calls the API", async () => {
    deleteRegistration.mockResolvedValueOnce({ ok: true });
    const user = await verTabla();

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
