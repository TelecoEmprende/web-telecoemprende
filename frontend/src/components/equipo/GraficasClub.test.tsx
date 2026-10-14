import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GraficasClub } from "./GraficasClub";

describe("GraficasClub", () => {
  it("dice qué departamento cojea: mucho trabajo y poca gente que lo prefiere", () => {
    render(
      <GraficasClub
        balance={{
          marketing: { preferencias: [2, 5, 6], abiertas: 4, vencidas: 0 },
          eventos: { preferencias: [6, 4, 3], abiertas: 4, vencidas: 1 },
          ingenieria: { preferencias: [10, 9, 10], abiertas: 4, vencidas: 3 },
        }}
      />,
    );

    // Las tres tartas (1ª, 2ª y 3ª opción) con su reparto.
    expect(screen.getByRole("img", { name: /1ª opción: Marketing 2, Eventos 6, Ingeniería 10/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /3ª opción/ })).toBeInTheDocument();
    // Marketing: 33% del trabajo, 11% de la gente (22 puntos de diferencia).
    expect(screen.getByText(/tiene el 33% del trabajo y solo el 11% lo prefiere/)).toBeInTheDocument();
    expect(screen.getByText("Ingeniería", { selector: ".graf-comparativa-depto-react" })).toBeInTheDocument();
  });

  it("sin trabajo ni atrasos no inventa alertas", () => {
    const vacio = { preferencias: [1, 1, 1] as [number, number, number], abiertas: 0, vencidas: 0 };
    render(<GraficasClub balance={{ marketing: vacio, eventos: vacio, ingenieria: vacio }} />);

    expect(screen.queryByText(/Ahí cojea el club/)).not.toBeInTheDocument();
    expect(screen.getByText("Ninguna tarea atrasada.")).toBeInTheDocument();
  });
});
