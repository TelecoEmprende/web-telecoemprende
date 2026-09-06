import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getEquipoSession, loginEquipo, logoutEquipo } from "../api/equipo";
import { Header } from "../components/layout/Header";
import { EquipoLoginForm } from "../components/equipo/EquipoLoginForm";
import { MarketingDashboard } from "../components/equipo/MarketingDashboard";
import { EventosDashboard } from "../components/equipo/EventosDashboard";
import type { ApiFailure } from "../types/api";
import type { Team } from "../types/equipo";

const TEAM_LABELS: Record<Team, string> = {
  marketing: "Marketing",
  eventos: "Eventos",
  ingenieria: "Ingeniería (panel admin)",
};

// El equipo de ingeniería no tiene un dashboard aquí: su acceso ya incluye
// sesión de /admin (ver login_equipo en el backend), así que su "tarjeta"
// es simplemente un enlace a ese panel en vez de un toggle local.
const DASHBOARD_TEAMS = new Set<Team>(["marketing", "eventos"]);

export function EquipoPage() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const session = await getEquipoSession();
        if (!active) return;

        if (session.authenticated) {
          setIsAuthenticated(true);
          setTeams(session.teams);
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
      setActiveTeam(null);
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="equipo-shell-react">
      <Header teamMode />
      <main className="equipo-content-react">
        {isCheckingSession ? (
          <p className="equipo-status-react">Comprobando sesión...</p>
        ) : !isAuthenticated ? (
          <EquipoLoginForm
            isSubmitting={isSubmitting}
            errorMessage={loginError}
            onSubmit={handleLogin}
          />
        ) : (
          <div className="equipo-home-react">
            <div className="equipo-home-header-react">
              <h1>TelecoEmprende Equipo</h1>
              <button
                type="button"
                className="secondary-btn-react"
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Saliendo..." : "Cerrar sesión"}
              </button>
            </div>

            <div className="equipo-cards-react">
              {teams.map((team) =>
                DASHBOARD_TEAMS.has(team) ? (
                  <button
                    key={team}
                    type="button"
                    className={`equipo-card-react${activeTeam === team ? " equipo-card-active-react" : ""}`}
                    onClick={() => setActiveTeam(team)}
                  >
                    {TEAM_LABELS[team]}
                  </button>
                ) : (
                  <Link key={team} to="/admin" className="equipo-card-react">
                    {TEAM_LABELS[team]}
                  </Link>
                ),
              )}
            </div>

            {activeTeam === "marketing" ? <MarketingDashboard /> : null}
            {activeTeam === "eventos" ? <EventosDashboard /> : null}
          </div>
        )}
      </main>
    </div>
  );
}
