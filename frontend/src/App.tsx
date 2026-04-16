import { Route, Routes } from "react-router-dom";

import { AdminPage } from "./routes/AdminPage";
import { HomePage } from "./routes/HomePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}
