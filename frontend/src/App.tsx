import { Route, Routes } from "react-router-dom";

import { LanguageProvider } from "./i18n/LanguageContext";
import { adminRoutes } from "./routes/admin";
import { DatosFormularioPage } from "./routes/DatosFormularioPage";
import { EquipoPage } from "./routes/EquipoPage";
import { EventoSantiPabloPage } from "./routes/EventoSantiPabloPage";
import { NotFoundPage } from "./routes/ErrorPage";
import { HomePage } from "./routes/HomePage";
import { NewsPage } from "./routes/NewsPage";
import { PrivacyPolicyPage } from "./routes/PrivacyPolicyPage";
import { ThankYouPage } from "./routes/ThankYouPage";

export default function App() {
  return (
    <LanguageProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/charla-santi-y-pablo" element={<EventoSantiPabloPage />} />
        <Route path="/gracias" element={<ThankYouPage />} />
        <Route path="/privacidad" element={<PrivacyPolicyPage />} />
        <Route path="/news" element={<NewsPage />} />
        {adminRoutes}
        <Route path="/equipo" element={<EquipoPage />} />
        <Route path="/equipo/datosformulario" element={<DatosFormularioPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </LanguageProvider>
  );
}
