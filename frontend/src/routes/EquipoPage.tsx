import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getEquipoSession, loginEquipo, logoutEquipo } from "../api/equipo";
import { Header } from "../components/layout/Header";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { CalendarioEquipo } from "../components/equipo/CalendarioEquipo";
import { EquipoLoginForm } from "../components/equipo/EquipoLoginForm";
import { MarketingDashboard } from "../components/equipo/MarketingDashboard";
import { EventosDashboard } from "../components/equipo/EventosDashboard";
import type { ApiFailure } from "../types/api";
import type { Cargo, Team } from "../types/equipo";

const TEAM_LABELS: Record<"marketing" | "eventos", string> = {
  marketing: "Marketing",
  eventos: "Eventos",
};

const CARGO_LABELS: Record<"presidente" | "boardmember", string> = {
  presidente: "Presidente",
  boardmember: "Board member",
};

// El equipo de ingeniería (y presidencia/board) no tiene un dashboard aquí:
// su acceso ya incluye sesión de /admin (ver login_equipo en el backend), así
// que su "tarjeta" es simplemente un enlace a ese panel.
const DASHBOARD_TEAMS: Array<"marketing" | "eventos"> = ["marketing", "eventos"];

export function EquipoPage() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [vpDe, setVpDe] = useState<Team[]>([]);
  const [cargo, setCargo] = useState<Cargo>("");
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
      setIsLoggingOut(false);
    }
  }

  const dashboardTeams = DASHBOARD_TEAMS.filter((team) => teams.includes(team));
  const tieneAccesoAdmin =
    teams.includes("ingenieria") || cargo === "presidente" || cargo === "boardmember";

  return (
    <div className="shadcn-scope dark equipo-shell-react bg-background font-sans text-foreground">
      <Header teamMode />
      <main className="equipo-content-react">
        {isCheckingSession ? (
          <p className="text-center text-muted-foreground">Comprobando sesión...</p>
        ) : !isAuthenticated ? (
          <EquipoLoginForm
            isSubmitting={isSubmitting}
            errorMessage={loginError}
            onSubmit={handleLogin}
          />
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">TelecoEmprende Equipo</h1>
                {cargo ? <Badge>{CARGO_LABELS[cargo]}</Badge> : null}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Saliendo..." : "Cerrar sesión"}
              </Button>
            </div>

            {dashboardTeams.length > 0 ? (
              <Tabs defaultValue={dashboardTeams[0]}>
                <TabsList>
                  {dashboardTeams.map((team) => (
                    <TabsTrigger key={team} value={team} className="gap-1.5">
                      {TEAM_LABELS[team]}
                      {vpDe.includes(team) ? <Badge variant="secondary">VP</Badge> : null}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="marketing">
                  <Card>
                    <CardContent>
                      <MarketingDashboard />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="eventos">
                  <Card>
                    <CardContent>
                      <EventosDashboard />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : null}

            {tieneAccesoAdmin ? (
              <Card>
                <CardHeader>
                  <CardTitle>Ingeniería</CardTitle>
                  <CardDescription>Panel de administración del club.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline">
                    <Link to="/admin">Ir al panel admin</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            <CalendarioEquipo />
          </div>
        )}
      </main>
    </div>
  );
}
