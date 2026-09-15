import { describe, expect, it } from "vitest";

import { etiquetaDe, fotoDe } from "./Avatares";

describe("fotoDe", () => {
  it("no le pone a los dos Davids la misma cara", () => {
    // El bug: adivinar la foto por el nombre de pila le daba a David Martín
    // la de David García, que es de quien hay .jpg en public/.
    expect(fotoDe("david.garcia@alumnos.upm.es")).toBe("/equipo-david-garcia.jpg");
    expect(fotoDe("david.martin@alumnos.upm.es")).toBeUndefined();
  });

  it("también distingue el email sin separadores", () => {
    expect(fotoDe("davidgarcia@gmail.com")).toBe("/equipo-david-garcia.jpg");
    expect(fotoDe("davidmartin@gmail.com")).toBeUndefined();
  });

  it("sigue encontrando a quien tiene una sola foto", () => {
    expect(fotoDe("hugo.perez@alumnos.upm.es")).toBe("/equipo-hugo.jpg");
    // El caso que ya cubría el prefijo: local-part de una sola palabra.
    expect(fotoDe("abrilespinosatortuero@gmail.com")).toBe("/equipo-abril.jpg");
  });

  it("quien no tiene foto se queda sin ella, no con la de otro", () => {
    expect(fotoDe("persona.nueva@alumnos.upm.es")).toBeUndefined();
  });
});

describe("etiquetaDe", () => {
  it("el nombre real del perfil manda sobre lo adivinado", () => {
    expect(etiquetaDe("david.garcia@upm.es", "David García")).toBe("David García");
  });

  it("sin perfil relleno, el apellido adivinado no sale pegado con guion", () => {
    expect(etiquetaDe("david.garcia@upm.es")).toBe("David Garcia");
    expect(etiquetaDe("hugo.perez@upm.es")).toBe("Hugo");
  });
});
