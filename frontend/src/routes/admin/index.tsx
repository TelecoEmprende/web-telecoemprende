import { Navigate, Route } from "react-router-dom";

import { CalendarioPanel } from "../../components/admin/CalendarioPanel";
import { EquipoAccesosPanel } from "../../components/admin/EquipoAccesosPanel";
import { AdminLayout } from "./AdminLayout";
import { InscripcionesView } from "./InscripcionesView";

/** Las rutas de /admin, en una sola pieza para que App y los tests monten
 *  exactamente el mismo árbol. Los dos paneles que ya se gestionan solos van
 *  directos: envolverlos en una vista propia solo añadiría un archivo. */
export const adminRoutes = (
  <Route path="/admin" element={<AdminLayout />}>
    <Route index element={<Navigate to="inscripciones" replace />} />
    <Route path="inscripciones" element={<InscripcionesView />} />
    <Route path="equipo" element={<EquipoAccesosPanel />} />
    <Route path="calendario" element={<CalendarioPanel />} />
  </Route>
);
