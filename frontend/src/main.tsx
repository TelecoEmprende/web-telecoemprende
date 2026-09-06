import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
// index.css (Tailwind/shadcn) debe importarse ANTES que tokens.css: ambos
// definen --color-primary/--color-background/--color-border/--radius-lg/md/xl
// en :root, y el resto del sitio necesita que gane tokens.css ahí. Dentro
// de `.shadcn-scope` (ver index.css) esos tokens se re-encadenan a los de
// shadcn, así que el orden no afecta a /equipo ni a los paneles nuevos.
import "./index.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/home.css";
import "./styles/admin.css";
import "./styles/landing.css";
import "./styles/equipo.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("No se encontro el contenedor root.");
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
