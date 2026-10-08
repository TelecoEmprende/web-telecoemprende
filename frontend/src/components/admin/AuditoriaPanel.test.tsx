import { describe, expect, it } from "vitest";

import { describir } from "./AuditoriaPanel";

describe("describir (auditoría)", () => {
  it("traduce rutas a frases", () => {
    expect(describir({ metodo: "DELETE", ruta: "/api/marketing/tasks/12", estado: 200 })).toBe(
      "Borró la tarea #12 · Marketing",
    );
    expect(describir({ metodo: "PUT", ruta: "/api/admin/equipo/3", estado: 200 })).toBe("Editó la cuenta #3");
    expect(describir({ metodo: "POST", ruta: "/api/equipo/notas", estado: 201 })).toBe("Creó la nota");
    expect(describir({ metodo: "POST", ruta: "/api/equipo/login", estado: 401 })).toBe(
      "Intento de entrar fallido",
    );
    expect(describir({ metodo: "GET", ruta: "/api/admin/equipo/excel", estado: 200 })).toBe(
      "Descargó el Excel de datos del equipo",
    );
    // Lo que no sabe nombrar lo enseña tal cual, no se lo inventa.
    expect(describir({ metodo: "POST", ruta: "/api/raro/cosa", estado: 200 })).toBe("POST /api/raro/cosa");
  });
});
