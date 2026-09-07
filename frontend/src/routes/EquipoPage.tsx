import { useEffect, useState } from "react";

import { getEquipoSession, loginEquipo, logoutEquipo } from "../api/equipo";
import { Header } from "../components/layout/Header";
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar";
import { CalendarioEquipo } from "../components/equipo/CalendarioEquipo";
import {
  EquipoSidebar,
  deptoDe,
  seccionesDe,
  type Seccion,
} from "../components/equipo/EquipoSidebar";
import { EquipoLoginForm } from "../components/equipo/EquipoLoginForm";
import { MarketingDashboard } from "../components/equipo/MarketingDashboard";
import { EventosDashboard } from "../components/equipo/EventosDashboard";
import type { ApiFailure } from "../types/api";
import type { Cargo, Team } from "../types/equipo";

export function EquipoPage() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [vpDe, setVpDe] = useState<Team[]>([]);
  const [cargo, setCargo] = useState<Cargo>("");
  const [loginError, setLoginError] = useState<string | null>(null);
  // Se abre en el inicio del club, que es lo único común a todo el mundo; las
  // secciones de cada departamento cuelgan debajo en el sidebar.
  const [seccion, setSeccion] = useState<Seccion>("club");

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const session = await getEquipoSession();
        if (!active) return;

        if (session.authenticated) {
          setIsAuthenticated(true);
          setTeams(session.teams);
          setVpDe(session.vp_de);
          setCargo(session.cargo);
        }
      } catch {
        // Sin sesión previa o backend no disponible: se queda en el login.
      } finally {
        if (active) setIsCheckingSession(false);
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogin(email: string, password: string) {
    setIsSubmitting(true);
    setLoginError(null);

    try {
      const response = await loginEquipo(email, password);

      if (response.ok) {
        setIsAuthenticated(true);
        setTeams(response.teams);
        setVpDe(response.vp_de);
        setCargo(response.cargo);
      }
    } catch (error) {
      const apiError = error as ApiFailure;
      setLoginError(apiError.message || "No se pudo iniciar sesión.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logoutEquipo();
    } finally {
      setIsAuthenticated(false);
      setTeams([]);
      setVpDe([]);
      setCargo("");
      setSeccion("club");
      setIsLoggingOut(false);
    }
  }

  // El equipo de ingeniería (y presidencia/board) no tiene secciones propias
  // aquí: su acceso ya incluye sesión de /admin (ver login_equipo en el
  // backend), así que el sidebar solo les ofrece el enlace a ese panel.
  const tieneAccesoAdmin =
    teams.includes("ingenieria") || cargo === "presidente" || cargo === "boardmember";

  if (!isAuthenticated) {
    return (
      <div className="shadcn-scope dark equipo-shell-react bg-background font-sans text-foreground">
        <Header teamMode />
        <main className="equipo-content-react">
          {isCheckingSession ? (
            <p className="text-center text-muted-foreground">Comprobando sesión...</p>
          ) : (
            <EquipoLoginForm
              isSubmitting={isSubmitting}
              errorMessage={loginError}
              onSubmit={handleLogin}
            />
          )}
        </main>
      </div>
    );
  }

  const titulo = seccionesDe(teams).find((s) => s.id === seccion)?.label ?? "";

  return (
    // El workspace se lleva la pantalla entera: no hay cabecera del sitio, la
    // navegación (y la salida) están en el sidebar.
    <div className="shadcn-scope dark equipo-workspace-react font-sans">
      <SidebarProvider>
        <EquipoSidebar
          seccion={seccion}
          onSeccion={setSeccion}
          teams={teams}
          vpDe={vpDe}
          cargo={cargo}
          tieneAccesoAdmin={tieneAccesoAdmin}
          onLogout={() => void handleLogout()}
          isLoggingOut={isLoggingOut}
        />

        <main className="equipo-main-react">
          <header className="equipo-barra-react">
            <SidebarTrigger />
            <span className="equipo-barra-depto-react">{deptoDe(seccion)}</span>
            <h2>{titulo}</h2>
          </header>

          <div className="equipo-contenido-react">
            {seccion === "club" ? <CalendarioEquipo /> : null}
            {seccion === "eventos" ? <EventosDashboard /> : null}
            {seccion.startsWith("mkt-") ? (
              <MarketingDashboard seccion={seccion} onSeccion={setSeccion} />
            ) : null}
          </div>
        </main>
      </SidebarProvider>
    </div>
  );
}
