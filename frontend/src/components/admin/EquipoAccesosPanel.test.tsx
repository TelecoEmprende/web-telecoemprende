import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { EquipoAccesosPanel } from "./EquipoAccesosPanel";

const cuenta = (id: number, nombre: string, apellidos: string, email: string) => ({
  id, email, nombre, apellidos, equipos: ["marketing", "eventos"], vp_de: [], cargo: "",
  activo: true, created_at: "2026-10-01T10:00:00", dni: "", correo_personal: "",
  mentor_email: "", foto: "", es_admin: false,
});

vi.mock("../../api/admin", () => ({
  getEquipoAccesos: () =>
    Promise.resolve({
      ok: true,
      accesos: [
        cuenta(1, "Lucía", "García López", "lucia@example.com"),
        cuenta(2, "Mario", "Núñez Gil", "mario@example.com"),
      ],
    }),
  createEquipoAcceso: vi.fn(),
  updateEquipoAcceso: vi.fn(),
  deleteEquipoAcceso: vi.fn(),
}));

describe("Cuentas del equipo", () => {
  it("busca por nombre y apellidos, sin tildes ni mayúsculas", async () => {
    render(
      <MemoryRouter>
        <EquipoAccesosPanel />
      </MemoryRouter>,
    );
    await screen.findByText("lucia@example.com");

    await userEvent.type(screen.getByLabelText("Buscar cuentas"), "nunez");
    expect(screen.queryByText("lucia@example.com")).not.toBeInTheDocument();
    expect(screen.getByText("mario@example.com")).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Buscar cuentas"));
    await userEvent.type(screen.getByLabelText("Buscar cuentas"), "lucia garcia");
    expect(screen.getByText("lucia@example.com")).toBeInTheDocument();
    expect(screen.queryByText("mario@example.com")).not.toBeInTheDocument();
  });
});
