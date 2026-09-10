import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useOutletContext } from "react-router-dom";

import { getAdminSession, loginAdmin, logoutAdmin } from "../../api/admin";
import { AdminLoginForm } from "../../components/admin/AdminLoginForm";
import { AlertBanner } from "../../components/feedback/AlertBanner";
import { Header } from "../../components/layout/Header";
import { SidebarProvider, SidebarTrigger } from "../../components/ui/sidebar";
import type { ApiFailure } from "../../types/api";
import { AdminSidebar, tituloDe } from "./AdminSidebar";

type Aviso = { variant: "info" | "success" | "error"; message: string };

/** Lo único que el layout comparte con sus vistas: cómo avisar al usuario.
 *  Los datos los pide cada vista, que es la que sabe cuáles necesita. */
export type AdminContexto = {
  avisar: (variant: Aviso["variant"], message: string) => void;
  /** Traduce un fallo de la API a un aviso, con su mensaje o el de reserva. */
  avisarError: (error: unknown, porDefecto: string) => void;
};

export function useAdmin() {
  return useOutletContext<AdminContexto>();
}

export function AdminLayout() {
  const { pathname } = useLocation();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const avisar = useCallback(
    (variant: Aviso["variant"], message: string) => setAviso({ variant, message }),
    [],
  );
  const avisarError = useCallback(
    (error: unknown, porDefecto: string) =>
      setAviso({ variant: "error", message: (error as ApiFailure).message || porDefecto }),
    [],
  );

  useEffect(() => {
    let active = true;

    getAdminSession()
      .then((session) => {
        if (active) setIsAuthenticated(session.authenticated);
      })
      .catch(() => {
        if (active) avisar("error", "No se pudo comprobar la sesión de administración.");
      })
      .finally(() => {
        if (active) setIsCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, [avisar]);

  async function handleLogin(password: string) {
    setIsSubmitting(true);
    setAviso(null);

    try {
      const response = await loginAdmin(password);
      if (response.ok) {
        setIsAuthenticated(true);
        avisar("success", response.message ?? "Sesión iniciada.");
      }
    } catch (error) {
      avisarError(error, "No se pudo iniciar sesión.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      const response = await logoutAdmin();
      if (response.ok) {
        setIsAuthenticated(false);
        avisar("success", response.message ?? "Sesión cerrada correctamente.");
      }
    } catch (error) {
      avisarError(error, "No se pudo cerrar la sesión.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  // Fuera de la sesión el panel sigue siendo una página normal, con la
  // cabecera del sitio: el workspace a pantalla completa es lo de dentro.
  if (!isAuthenticated) {
    return (
      <div className="page-shell">
        <Header adminMode />
        <main className="page-content">
          <section className="admin-shell-react">
            <div className="container-react">
              <section className="admin-card-react shadcn-scope">
                {aviso ? <AlertBanner variant={aviso.variant} message={aviso.message} /> : null}
                {isCheckingSession ? (
                  <div className="section-card admin-placeholder">
                    <p className="eyebrow">Cargando</p>
                    <h1>Comprobando sesión de administración...</h1>
                  </div>
                ) : (
                  <AdminLoginForm isSubmitting={isSubmitting} onSubmit={handleLogin} />
                )}
              </section>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="shadcn-scope dark workspace-react font-sans">
      <SidebarProvider>
        <AdminSidebar onLogout={() => void handleLogout()} isLoggingOut={isLoggingOut} />

        <main className="workspace-main-react">
          <header className="workspace-barra-react">
            <SidebarTrigger />
            <span className="workspace-barra-depto-react">Admin</span>
            <h2>{tituloDe(pathname)}</h2>
          </header>

          <div className="workspace-contenido-react">
            {aviso ? <AlertBanner variant={aviso.variant} message={aviso.message} /> : null}
            <Outlet context={{ avisar, avisarError } satisfies AdminContexto} />
          </div>
        </main>
      </SidebarProvider>
    </div>
  );
}
