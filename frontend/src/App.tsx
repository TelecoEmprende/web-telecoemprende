import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { LanguageProvider } from "./i18n/LanguageContext";
import { NotFoundPage } from "./routes/ErrorPage";
import { HomePage } from "./routes/HomePage";
import { NewsPage } from "./routes/NewsPage";
import { PrivacyPolicyPage } from "./routes/PrivacyPolicyPage";

// El CRM se descarga solo al entrar en /equipo: quien visita la web pública
// no se lleva su código (shadcn, el tablero, el calendario...).
const EquipoPage = lazy(() => import("./routes/EquipoPage").then((m) => ({ default: m.EquipoPage })));

export default function App() {
  return (
    <LanguageProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/privacidad" element={<PrivacyPolicyPage />} />
        <Route path="/news" element={<NewsPage />} />
        {/* /admin vive ahora dentro de /equipo (grupo Admin del sidebar). */}
        <Route path="/admin/*" element={<Navigate to="/equipo" replace />} />
        <Route
          path="/equipo"
          element={
            // Mientras llega, el mismo fondo que la pantalla de entrada.
            <Suspense fallback={<div className="acceso-react" />}>
              <EquipoPage />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </LanguageProvider>
  );
}
