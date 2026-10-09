import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "../../i18n/LanguageContext";
import { TeamSection } from "./TeamSection";

vi.mock("../../api/equipo", () => ({
  getMiembrosWeb: vi.fn().mockResolvedValue({
    ok: true,
    miembros: [{ nombre: "Ana", apellido: "García", foto: "data:image/png;base64,AAAA" }],
  }),
}));

describe("Sección Equipo de la web", () => {
  it("pinta nombre, primer apellido y la foto de la cuenta de /equipo", async () => {
    render(
      <LanguageProvider>
        <TeamSection />
      </LanguageProvider>,
    );
    expect(await screen.findByText("Ana García")).toBeInTheDocument();
    expect(screen.getByAltText(/Ana García$/)).toHaveAttribute("src", "data:image/png;base64,AAAA");
  });
});
