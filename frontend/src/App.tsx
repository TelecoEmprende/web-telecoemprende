import { Route, Routes } from "react-router-dom";

import { AdminPage } from "./routes/AdminPage";
import { HomePage } from "./routes/HomePage";
import { ThankYouPage } from "./routes/ThankYouPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/gracias" element={<ThankYouPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}
