import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { getEquipoSession, loginEquipo, logoutEquipo, registrarEquipo } from "../api/equipo";
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar";
import { AuditoriaPanel } from "../components/admin/AuditoriaPanel";
import { CalendarioPanel } from "../components/admin/CalendarioPanel";
import { EquipoAccesosPanel } from "../components/admin/EquipoAccesosPanel";
import { InscripcionesView } from "../components/admin/InscripcionesView";
import { CalendarioEquipo } from "../components/equipo/CalendarioEquipo";
import {
  EquipoSidebar,
  equiposConPanel,
  seccionesDe,
  type Panel,
  type Seccion,
} from "../components/equipo/EquipoSidebar";
import { EquipoLoginForm, type ModoAcceso } from "../components/equipo/EquipoLoginForm";
import { DeptoDashboard } from "../components/equipo/DeptoDashboard";
import { HerramientasPanel } from "../components/equipo/HerramientasPanel";
import { MetricasPanel } from "../components/equipo/MetricasPanel";
import { NotasPanel } from "../components/equipo/notas/NotasPanel";
import { PanelAnimado } from "../components/movimiento";
import type { ApiFailure } from "../types/api";
import { DEPTO_LABEL, type Cargo, type Team } from "../types/equipo";

const PANELES: Panel[] = [
  "tareas", "campanas", "miembros", "presupuesto", "reuniones",
];

/** Título de la barra para las secciones del grupo Admin, que no salen de
 *  `seccionesDe`. */
const TITULO_ADMIN: Partial<Record<Seccion, string>> = {
  metricas: "Métricas",
  presupuesto: "Presupuesto",
  inscripciones: "Inscripciones",
  cuentas: "Cuentas del equipo",
  "calendario-club": "Calendario del club",
  auditoria: "Auditoría",
};

function esPanel(seccion: Seccion): seccion is Panel {
  return (PANELES as string[]).includes(seccion);
}

export function EquipoPage() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [vpDe, setVpDe] = useState<Team[]>([]);
  const [cargo, setCargo] = useState<Cargo>("");
  // Permiso de admin (grupo Admin del sidebar), aparte del departamento y
  // del cargo: lo marca otra persona con admin en Cuentas del equipo.
  const [esAdmin, setEsAdmin] = useState(false);
  /** Quién ha entrado: el pie del sidebar lo enseña, como en el boceto. */
  const [perfil, setPerfil] = useState({ nombre: "", email: "" });
  const [loginError, setLoginError] = useState<string | null>(null);
  // ponytail: solo lo usa el alta temporal de cuentas (ver EquipoLoginForm).
  const [registroMessage, setRegistroMessage] = useState<string | null>(null);
  // Se abre en el inicio del club, que es lo único común a todo el mundo.
  const [seccion, setSeccion] = useState<Seccion>("club");
  // Qué departamentos se ven a la vez en un panel compartido (Tareas,
  // Proyectos...). El sidebar NUNCA depende de esto -- tiene una sola
  // entrada por panel siempre; esto solo filtra qué datos se cargan dentro.
  // Por defecto, todos los que la persona tiene.
  const [deptosFiltro, setDeptosFiltro] = useState<Team[]>([]);
  // La campaña que "Proyectos" abre directamente al montar: por un enlace
  // compartido (?campaign=, ver el efecto de abajo) o porque se saltó aquí
  // desde un evento del calendario de otro departamento (`abrirCampaign`).
  const [campaignInicial, setCampaignInicial] = useState<number | null>(null);
  // La nota que "Notas" abre al montar (desde el Inicio).
  const [notaInicial, setNotaInicial] = useState<number | null>(null);
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
          setEsAdmin(session.admin);
          setPerfil({ nombre: session.nombre, email: session.email });
          setDeptosFiltro(session.teams);
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
  // ?campaign=<id> en la URL se abre directo en Proyectos, acotado al primer
  // departamento de la persona -- no resuelve el departamento por sí solo, si
  // el enlace es de otro no aparece, pero evita tener que explicar "entra
  // primero a Proyectos". Depende de `teams`, que llega async tras el login.
  useEffect(() => {
    if (teams.length === 0) return;
    const campaignId = Number(searchParams.get("campaign"));
    if (!campaignId) return;

    setCampaignInicial(campaignId);
    setDeptosFiltro([teams[0]]);
    setSeccion("campanas");
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

  // "Crear acceso de equipo" desde una inscripción aceptada abre Cuentas con
  // el alta prellenada (`?seccion=cuentas&nombre=…`, que lee el propio panel).
  useEffect(() => {
    if (searchParams.get("seccion") === "cuentas") setSeccion("cuentas");
  }, [searchParams]);

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
        setEsAdmin(response.admin);
        // La respuesta del login no repite el email: es el que se acaba de
        // teclear.
        setPerfil({ nombre: response.nombre, email });
        setDeptosFiltro(response.teams);
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
      setEsAdmin(false);
      setPerfil({ nombre: "", email: "" });
      setSeccion("club");
      setDeptosFiltro([]);
      setIsLoggingOut(false);
    }
  }

  /** Desde el calendario se salta a la campaña del elemento tocado -- puede
   *  ser de un departamento distinto al filtrado, así que acota el filtro a
   *  ese uno para que se vea sin ambigüedad. */
  function abrirCampaign(campaignId: number, departamento: Team) {
    setCampaignInicial(campaignId);
    setDeptosFiltro([departamento]);
    setSeccion("campanas");
  }

  function abrirNota(id: number) {
    setNotaInicial(id);
    setSeccion("notas");
  }

  const tieneAccesoAdmin = esAdmin;
  // Igual que `_puede_asignar_tareas` en el backend: un cargo (o admin)
  // asigna en cualquier departamento; un VP, solo en el suyo.
  const puedeAsignarEnTodo = esAdmin || cargo !== "";

  if (!isAuthenticated) {
    return (
      // Fuera de sesión, la portada de la web: plano Azul TE, titular Anton y
      // el círculo Impulso entrando por la esquina (ver `.in-hero`). La carga
      // usa la misma carcasa, así que pasar de "comprobando" al formulario no
      // cambia de pantalla.
      <div className="shadcn-scope acceso-react font-sans">
        <div className="acceso-circulo-react" aria-hidden="true" />

        <header className="acceso-barra-react">
          <Link to="/" className="acceso-marca-react">
            <img src="/logo-blanco.png" alt="" />
            <span>TelecoEmprende</span>
          </Link>
          <Link to="/" className="acceso-volver-react">
            <ArrowLeft aria-hidden="true" />
            Volver a la web
          </Link>
        </header>

        {isCheckingSession ? (
          <main className="acceso-cargando-react" aria-busy="true">
            <span className="acceso-latido-react" aria-hidden="true">
              <img src="/logo-blanco.png" alt="" />
            </span>
            <p role="status">Abriendo el área del equipo…</p>
          </main>
        ) : (
          <main className="acceso-main-react">
            <div className="acceso-intro-react">
              <p className="acceso-eyebrow-react">Área del equipo</p>
              <h1 className="acceso-titular-react">
                El club,
                <br />
                por <span className="is-chispa">dentro.</span>
              </h1>
              <p className="acceso-lead-react">
                Notas, tareas, calendario y herramientas del club en un solo sitio.
              </p>
            </div>

            {/* La entrada se anima en este contenedor, que no se desmonta: el
                formulario y "cuenta creada" son dos <section> distintas y,
                animadas ellas, cambiar de una a otra repetía la entrada. */}
            <div className="acceso-tarjeta-react">
              <EquipoLoginForm
                isSubmitting={isSubmitting}
                errorMessage={loginError}
                successMessage={registroMessage}
                onSubmit={handleLogin}
                onModeChange={limpiarMensajes}
              />
            </div>
          </main>
        )}
      </div>
    );
  }

  // Qué departamentos de la persona tienen el panel actual, y cuáles de esos
  // están marcados en el filtro ahora mismo -- si se deselecciona todo, se
  // trata como "todos" (nunca se puede quedar en cero paneles con datos).
  const equiposDelPanel = esPanel(seccion) ? equiposConPanel(seccion, teams) : [];
  const seleccionEnPanel = equiposDelPanel.filter((t) => deptosFiltro.includes(t));
  const deptosDelPanel = seleccionEnPanel.length > 0 ? seleccionEnPanel : equiposDelPanel;

  const titulo = seccionesDe(teams).find((s) => s.id === seccion)?.label ?? TITULO_ADMIN[seccion] ?? "";
  function alternarDepto(team: Team) {
    setDeptosFiltro((actuales) => {
      const activos = equiposDelPanel.filter((t) => actuales.includes(t));
      const base = activos.length > 0 ? activos : equiposDelPanel;
      const siguiente = base.includes(team) ? base.filter((t) => t !== team) : [...base, team];
      // El resto de deptosFiltro (de otros paneles) se conserva tal cual.
      return [...actuales.filter((t) => !equiposDelPanel.includes(t)), ...siguiente];
    });
  }

  return (
    // El workspace se lleva la pantalla entera: no hay cabecera del sitio, la
    // navegación (y la salida) están en el sidebar.
    <div className="shadcn-scope workspace-react crm-react font-sans">
      <SidebarProvider>
        <EquipoSidebar
          seccion={seccion}
          onSeccion={setSeccion}
          teams={teams}
          vpDe={vpDe}
          cargo={cargo}
          nombre={perfil.nombre}
          email={perfil.email}
          tieneAccesoAdmin={tieneAccesoAdmin}
          onLogout={() => void handleLogout()}
          isLoggingOut={isLoggingOut}
        />

        <main className="workspace-main-react">
          <header className="workspace-barra-react">
            <SidebarTrigger />
            <h2>{titulo}</h2>

            {/* Miembros filtra dentro de su panel (con "Todos"), no aquí. */}
            {equiposDelPanel.length > 1 && seccion !== "miembros" ? (
              <div className="workspace-selector-depto-react" role="group" aria-label="Departamentos visibles">
                {equiposDelPanel.map((team) => (
                  <label
                    key={team}
                    className={`crm-tag crm-tag-check-react${
                      deptosDelPanel.includes(team) ? " crm-tag-azul-react" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="crm-check"
                      checked={deptosDelPanel.includes(team)}
                      onChange={() => alternarDepto(team)}
                    />
                    {DEPTO_LABEL[team]}
                  </label>
                ))}
              </div>
            ) : null}
          </header>

          <div className="workspace-contenido-react">
            <PanelAnimado llave={seccion}>
            {seccion === "club" ? (
              <CalendarioEquipo onIrA={setSeccion} onAbrirNota={abrirNota} />
            ) : null}
            {seccion === "notas" ? (
              <NotasPanel
                email={perfil.email}
                teams={teams}
                notaInicial={notaInicial}
                onNotaAbierta={() => setNotaInicial(null)}
              />
            ) : null}
            {seccion === "metricas" ? <MetricasPanel /> : null}
            {seccion === "herramientas" ? <HerramientasPanel teams={teams} /> : null}
            {/* Lo que antes era /admin. El sidebar solo ofrece estas entradas con
                `tieneAccesoAdmin`, y el backend las vuelve a comprobar. */}
            {tieneAccesoAdmin && seccion === "inscripciones" ? <InscripcionesView /> : null}
            {tieneAccesoAdmin && seccion === "cuentas" ? <EquipoAccesosPanel /> : null}
            {tieneAccesoAdmin && seccion === "calendario-club" ? <CalendarioPanel /> : null}
            {tieneAccesoAdmin && seccion === "auditoria" ? <AuditoriaPanel /> : null}
            {esPanel(seccion) || seccion === "calendario" ? (
              // `key` para que cambiar de departamento(s) remonte el panel: si
              // no, dos conjuntos de departamentos comparten estado y el
              // tablero enseña un momento los datos del anterior.
              <DeptoDashboard
                key={`${seccion}:${(esPanel(seccion) ? deptosDelPanel : [teams[0]]).join(",")}`}
                depto={(esPanel(seccion) ? deptosDelPanel[0] : teams[0]) ?? teams[0]}
                deptos={esPanel(seccion) ? deptosDelPanel : [teams[0]].filter(Boolean) as Team[]}
                seccion={seccion as Panel | "calendario"}
                teams={teams}
                campaignInicial={seccion === "campanas" ? campaignInicial : null}
                onCampaignAbierta={() => setCampaignInicial(null)}
                onAbrirCampaign={abrirCampaign}
                vpDe={vpDe}
                puedeAsignarEnTodo={puedeAsignarEnTodo}
                onAbrirNota={abrirNota}
              />
            ) : null}
            </PanelAnimado>
          </div>
        </main>
      </SidebarProvider>
    </div>
  );
}
