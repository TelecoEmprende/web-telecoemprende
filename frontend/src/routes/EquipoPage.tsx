import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { getEquipoSession, loginEquipo, logoutEquipo, registrarEquipo } from "../api/equipo";
import { Header } from "../components/layout/Header";
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar";
import { CalendarioEquipo } from "../components/equipo/CalendarioEquipo";
import {
  EquipoSidebar,
  equiposConPanel,
  etiquetaDeDepto,
  seccionesDe,
  type Panel,
  type Seccion,
} from "../components/equipo/EquipoSidebar";
import { EquipoLoginForm, type ModoAcceso } from "../components/equipo/EquipoLoginForm";
import { DeptoDashboard } from "../components/equipo/DeptoDashboard";
import { MetricasPanel } from "../components/equipo/MetricasPanel";
import type { ApiFailure } from "../types/api";
import type { Cargo, Team } from "../types/equipo";

const PANELES: Panel[] = [
  "tareas", "campanas", "miembros", "recursos", "presupuesto", "reuniones", "alumni",
];

function esPanel(seccion: Seccion): seccion is Panel {
  return (PANELES as string[]).includes(seccion);
}

const TEAM_LABEL: Record<Team, string> = {
  marketing: "Marketing",
  eventos: "Eventos",
  ingenieria: "Ingeniería",
};

export function EquipoPage() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [vpDe, setVpDe] = useState<Team[]>([]);
  const [cargo, setCargo] = useState<Cargo>("");
  const [loginError, setLoginError] = useState<string | null>(null);
  // ponytail: solo lo usa el alta temporal de cuentas (ver EquipoLoginForm).
  const [registroMessage, setRegistroMessage] = useState<string | null>(null);
  // Se abre en el inicio del club, que es lo único común a todo el mundo.
  const [seccion, setSeccion] = useState<Seccion>("club");
  // Qué departamento ve un panel compartido (Tareas, Proyectos, Miembros...)
  // cuando la persona está en más de uno con ese panel -- antes esto salía
  // de qué grupo del sidebar se tocaba (uno por departamento); ahora el
  // sidebar tiene una sola entrada por panel y este selector decide.
  const [deptoActivo, setDeptoActivo] = useState<Team | null>(null);
  // La campaña que "Proyectos" abre directamente al montar: por un enlace
  // compartido (?campaign=, ver el efecto de abajo) o porque se saltó aquí
  // desde un evento del calendario de otro departamento (`abrirCampaign`).
  const [campaignInicial, setCampaignInicial] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

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
          setDeptoActivo(session.teams[0] ?? null);
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

  // Enlace compartible (ver "Copiar enlace" en CampaignsPanel): al entrar con
  // ?campaign=<id> en la URL se abre directo en Proyectos, del primer
  // departamento de la persona -- no resuelve el departamento por sí solo, si
  // el enlace es de otro no aparece, pero evita tener que explicar "entra
  // primero a Proyectos". Depende de `teams`, que llega async tras el login.
  useEffect(() => {
    if (teams.length === 0) return;
    const campaignId = Number(searchParams.get("campaign"));
    if (!campaignId) return;

    setCampaignInicial(campaignId);
    irA("campanas", teams[0]);
    setSearchParams(
      (actuales) => {
        const siguientes = new URLSearchParams(actuales);
        siguientes.delete("campaign");
        return siguientes;
      },
      { replace: true },
    );
    // Solo cuando `teams` pasa de vacío a poblado (login/bootstrap), no en
    // cada cambio de sección.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams]);

  async function handleLogin(email: string, password: string, modo: ModoAcceso) {
    setIsSubmitting(true);
    setLoginError(null);
    setRegistroMessage(null);

    try {
      if (modo === "registro") {
        const response = await registrarEquipo(email, password);
        if (response.ok) {
          setRegistroMessage(response.message ?? "Cuenta creada.");
        }
        return;
      }

      const response = await loginEquipo(email, password);

      if (response.ok) {
        setIsAuthenticated(true);
        setTeams(response.teams);
        setVpDe(response.vp_de);
        setCargo(response.cargo);
        setDeptoActivo(response.teams[0] ?? null);
      }
    } catch (error) {
      const apiError = error as ApiFailure;
      setLoginError(
        apiError.message ||
          (modo === "registro" ? "No se pudo crear la cuenta." : "No se pudo iniciar sesión."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function limpiarMensajes() {
    setLoginError(null);
    setRegistroMessage(null);
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
      setDeptoActivo(null);
      setIsLoggingOut(false);
    }
  }

  /** Cambia de sección y, si el panel al que se entra no lo tiene el
   *  departamento activo, salta al primero que sí -- así "Tareas" siempre
   *  abre con datos reales aunque el último departamento visto fuera, por
   *  ejemplo, uno sin Presupuesto. */
  function irA(destino: Seccion, depto?: Team) {
    if (depto) {
      setDeptoActivo(depto);
      setSeccion(destino);
      return;
    }
    if (esPanel(destino)) {
      const disponibles = equiposConPanel(destino, teams);
      if (deptoActivo === null || !disponibles.includes(deptoActivo)) {
        setDeptoActivo(disponibles[0] ?? null);
      }
    }
    setSeccion(destino);
  }

  /** Desde el calendario se salta a la campaña del elemento tocado -- puede
   *  ser de un departamento DISTINTO al activo (ver `irA`, que ya remonta el
   *  panel con `key` al cambiar de departamento). */
  function abrirCampaign(campaignId: number, departamento: Team) {
    setCampaignInicial(campaignId);
    irA("campanas", departamento);
  }

  // El equipo de ingeniería (y presidencia/board) no tiene secciones propias
  // aquí: su acceso ya incluye sesión de /admin (ver login_equipo en el
  // backend), así que el sidebar solo les ofrece el enlace a ese panel.
  const esBoard = cargo === "presidente" || cargo === "boardmember";
  const tieneAccesoAdmin = teams.includes("ingenieria") || esBoard;

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
              successMessage={registroMessage}
              onSubmit={handleLogin}
              onModeChange={limpiarMensajes}
            />
          )}
        </main>
      </div>
    );
  }

  const esBoardOVp = esBoard || vpDe.length > 0;
  const equiposDelPanel = esPanel(seccion) ? equiposConPanel(seccion, teams) : [];
  // Con un panel de un departamento concreto, el título habla su idioma
  // (Eventos llama "Gestiones" a sus tareas); el resto usa la etiqueta
  // genérica del sidebar. Ver `etiquetaDeDepto`.
  const titulo = esPanel(seccion)
    ? etiquetaDeDepto(seccion, deptoActivo)
    : (seccionesDe(teams, esBoardOVp, deptoActivo).find((s) => s.id === seccion)?.label ?? "");
  const rotuloBarra =
    seccion === "club" || seccion === "metricas" || seccion === "calendario" || seccion === "anuncios"
      ? "Club"
      : deptoActivo
        ? TEAM_LABEL[deptoActivo]
        : "Club";

  return (
    // El workspace se lleva la pantalla entera: no hay cabecera del sitio, la
    // navegación (y la salida) están en el sidebar.
    <div className="shadcn-scope workspace-react font-sans">
      <SidebarProvider>
        <EquipoSidebar
          seccion={seccion}
          onSeccion={(destino) => irA(destino)}
          teams={teams}
          vpDe={vpDe}
          cargo={cargo}
          deptoActivo={deptoActivo}
          tieneAccesoAdmin={tieneAccesoAdmin}
          onLogout={() => void handleLogout()}
          isLoggingOut={isLoggingOut}
        />

        <main className="workspace-main-react">
          <header className="workspace-barra-react">
            <SidebarTrigger />
            <span className="workspace-barra-depto-react">{rotuloBarra}</span>
            <h2>{titulo}</h2>

            {equiposDelPanel.length > 1 ? (
              <div className="workspace-selector-depto-react" role="group" aria-label="Departamento">
                {equiposDelPanel.map((team) => (
                  <button
                    key={team}
                    type="button"
                    className={`mkt-btn-mini-react${deptoActivo === team ? " mkt-btn-mini-activo-react" : ""}`}
                    aria-pressed={deptoActivo === team}
                    onClick={() => setDeptoActivo(team)}
                  >
                    {TEAM_LABEL[team]}
                  </button>
                ))}
              </div>
            ) : null}
          </header>

          <div className="workspace-contenido-react">
            {seccion === "club" ? (
              <CalendarioEquipo onVerAnuncios={teams.length > 0 ? () => irA("anuncios") : undefined} />
            ) : null}
            {seccion === "metricas" ? <MetricasPanel /> : null}
            {(esPanel(seccion) || seccion === "calendario" || seccion === "anuncios") &&
            (deptoActivo ?? teams[0]) ? (
              // `key` para que cambiar de departamento remonte el panel: si
              // no, dos departamentos comparten estado y el tablero enseña
              // un momento las tareas del anterior.
              <DeptoDashboard
                key={`${deptoActivo ?? teams[0]}-${esPanel(seccion) ? seccion : "club"}`}
                depto={deptoActivo ?? teams[0]}
                seccion={seccion as Panel | "calendario" | "anuncios"}
                teams={teams}
                campaignInicial={seccion === "campanas" ? campaignInicial : null}
                onCampaignAbierta={() => setCampaignInicial(null)}
                onAbrirCampaign={abrirCampaign}
                puedeAsignarTareas={!!deptoActivo && (esBoard || vpDe.includes(deptoActivo))}
              />
            ) : null}
          </div>
        </main>
      </SidebarProvider>
    </div>
  );
}
