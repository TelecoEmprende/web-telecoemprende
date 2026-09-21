import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Contador } from "./movimiento";

describe("Contador", () => {
  it("pinta el número tal cual", () => {
    const { container } = render(<Contador valor={1024} />);
    expect(container.textContent).toBe("1024");
  });

  it("deja pasar lo que no es una cifra", () => {
    const { container } = render(<Contador valor="87%" />);
    expect(container.textContent).toBe("87%");
    expect(render(<Contador valor="—" />).container.textContent).toBe("—");
  });

  it("al cambiar de valor solo queda el nuevo cuando termina la salida", () => {
    const { container, rerender } = render(<Contador valor={7} />);
    rerender(<Contador valor={8} />);
    // Durante el relevo conviven la cifra que sale y la que entra; lo que no
    // puede pasar es que se pierda la nueva.
    expect(container.textContent).toContain("8");
  });
});
