import { Navigate, Route, Routes } from "react-router-dom";

import { LanguageProvider } from "./i18n/LanguageContext";
import { EquipoPage } from "./routes/EquipoPage";
import { NotFoundPage } from "./routes/ErrorPage";
import { HomePage } from "./routes/HomePage";
import { NewsPage } from "./routes/NewsPage";
import { PrivacyPolicyPage } from "./routes/PrivacyPolicyPage";

export default function App() {
  return (
    <LanguageProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/privacidad" element={<PrivacyPolicyPage />} />
        <Route path="/news" element={<NewsPage />} />
        {/* /admin vive ahora dentro de /equipo (grupo Admin del sidebar). */}
        <Route path="/admin/*" element={<Navigate to="/equipo" replace />} />
        <Route path="/equipo" element={<EquipoPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </LanguageProvider>
  );
}
