import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContadorCaracteres } from "./ContadorCaracteres";

describe("ContadorCaracteres", () => {
  it("no se muestra lejos del límite", () => {
    const { container } = render(<ContadorCaracteres valor="hola" maximo={100} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("se muestra cerca del límite, sin marcar error", () => {
    render(<ContadorCaracteres valor={"a".repeat(85)} maximo={100} />);
    expect(screen.getByText("85/100")).toBeInTheDocument();
    expect(screen.getByText("85/100")).not.toHaveClass("contador-caracteres-excedido-react");
  });

  it("marca error al pasarse del límite", () => {
    render(<ContadorCaracteres valor={"a".repeat(101)} maximo={100} />);
    expect(screen.getByText("101/100")).toHaveClass("contador-caracteres-excedido-react");
  });
});
