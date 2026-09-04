import { Route, Routes } from "react-router-dom";

import { LanguageProvider } from "./i18n/LanguageContext";
import { AdminPage } from "./routes/AdminPage";
import { EventoSantiPabloPage } from "./routes/EventoSantiPabloPage";
import { HomePage } from "./routes/HomePage";
import { ThankYouPage } from "./routes/ThankYouPage";

export default function App() {
  return (
    <LanguageProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/charla-santi-y-pablo" element={<EventoSantiPabloPage />} />
        <Route path="/gracias" element={<ThankYouPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </LanguageProvider>
  );
}
