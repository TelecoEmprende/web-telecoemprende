import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  ExternalLink,
  FolderOpen,
  GitBranch,
  Handshake,
  Home,
  KanbanSquare,
  LogOut,
  Megaphone,
  Megaphone as Anuncio,
  ScrollText,
  ServerCog,
  Settings,
  Users,
  Users2,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { AvatarResponsable, etiquetaDe } from "./marketing/Avatares";
import { GITHUB_REPO, type Cargo, type Team } from "../../types/equipo";

/** Una entrada de la navegación: un panel, no un par departamento+panel. Antes
 *  cada departamento repetía su propio "Tareas"/"Campañas"/"Miembros" en el
 *  sidebar; ahora hay una sola entrada por panel, siempre con la misma
 *  etiqueta -- el filtro de departamento (checkboxes dentro del panel, ver
 *  `EquipoPage.tsx`) no toca nunca el sidebar. */
type Item = { id: Seccion; label: string; icono: LucideIcon };

export type Panel =
  | "tareas"
  | "campanas"
  | "miembros"
  | "recursos"
  | "presupuesto"
  | "reuniones"
  | "alumni"
  | "plataforma"
  | "decisiones"
  | "servicios";

export type Seccion = "club" | "metricas" | "calendario" | "anuncios" | Panel;

/** Qué panel tiene cada departamento. Los tres comparten Tareas, Recursos y
 *  Miembros; Campañas es de Marketing/Eventos (Ingeniería no tiene, ver
 *  `docs/CLAUDE.md`); Presupuesto es de quien mueve dinero (Eventos) y Alumni,
 *  Plataforma, Servicios y Decisiones de Ingeniería. Esto decide qué panel aparece (`seccionesDe`) y qué
 *  departamentos ofrece el filtro dentro de cada uno (`equiposConPanel`). */
const PANELES_POR_EQUIPO: Record<Team, Panel[]> = {
  marketing: ["campanas", "tareas", "recursos", "miembros"],
  eventos: ["campanas", "tareas", "recursos", "presupuesto", "reuniones", "miembros"],
  ingenieria: [
    "tareas", "plataforma", "servicios", "decisiones", "alumni", "reuniones", "recursos", "miembros",
  ],
};

const ICONO: Record<Panel, LucideIcon> = {
  campanas: Megaphone,
  tareas: KanbanSquare,
  miembros: Users,
  recursos: FolderOpen,
  presupuesto: Wallet,
  reuniones: Users2,
  alumni: Handshake,
  plataforma: Activity,
  decisiones: ScrollText,
  servicios: ServerCog,
};

/** Etiqueta del panel en el sidebar: siempre la misma, para todo el mundo,
 *  la vea con uno o con varios departamentos filtrados. El vocabulario
 *  propio de un departamento (Eventos llama "Eventos" a sus campañas) no
 *  vive aquí -- si hace falta, va dentro del propio panel, nunca cambiando
 *  esta entrada. */
const ETIQUETA_PANEL: Record<Panel, string> = {
  campanas: "Proyectos",
  tareas: "Tareas",
  miembros: "Miembros",
  recursos: "Recursos",
  presupuesto: "Presupuesto",
  reuniones: "Reuniones",
  alumni: "Red Alumni",
  plataforma: "Plataforma",
  decisiones: "Decisiones",
  servicios: "Servicios",
};

/** Qué departamentos de la persona tienen este panel -- para el filtro
 *  interno del panel (checkboxes) cuando hay más de uno. */
export function equiposConPanel(panel: Panel, teams: Team[]): Team[] {
  return teams.filter((t) => PANELES_POR_EQUIPO[t].includes(panel));
}

/** Todas las secciones visibles para esa persona, en el orden del sidebar --
 *  primero lo del boceto (Mi semana, Tareas, Proyectos, Calendario, Miembros,
 *  Avisos), luego lo que no sale ahí porque es de un departamento concreto
 *  (Recursos, Presupuesto, Reuniones, Alumni). Métricas y Presupuesto no
 *  están aquí -- son del grupo "Admin" (ver `EquipoSidebar`). */
export function seccionesDe(teams: Team[]): Item[] {
  const paneles = new Set<Panel>(teams.flatMap((t) => PANELES_POR_EQUIPO[t]));
  const item = (id: Panel): Item[] =>
    paneles.has(id) ? [{ id, label: ETIQUETA_PANEL[id], icono: ICONO[id] }] : [];

  return [
    { id: "club", label: "Mi semana", icono: Home },
    ...item("tareas"),
    ...item("campanas"),
    ...(teams.length > 0
      ? [{ id: "calendario" as const, label: "Calendario", icono: CalendarDays }]
      : []),
    ...item("miembros"),
    ...(teams.length > 0
      ? [{ id: "anuncios" as const, label: "Avisos", icono: Anuncio }]
      : []),
    ...item("recursos"),
    ...item("reuniones"),
    ...item("alumni"),
    ...item("plataforma"),
    ...item("servicios"),
    ...item("decisiones"),
  ];
}

const CARGO_LABEL: Record<Exclude<Cargo, "">, string> = {
  presidente: "Presidente",
  boardmember: "Board member",
};

const TEAM_LABEL: Record<Team, string> = {
  marketing: "Marketing",
  eventos: "Eventos",
  ingenieria: "Ingeniería",
};

type Props = {
  seccion: Seccion;
  onSeccion: (seccion: Seccion) => void;
  teams: Team[];
  vpDe: Team[];
  cargo: Cargo;
  /** Quién ha entrado, para el pie del sidebar (boceto 2a). */
  nombre: string;
  email: string;
  tieneAccesoAdmin: boolean;
  onLogout: () => void;
  isLoggingOut: boolean;
};

/** "VP de Marketing", "Board", "Marketing + Eventos": lo que pone debajo del
 *  nombre en el pie del sidebar. El cargo manda sobre el departamento -- es
 *  lo que explica por qué esa persona ve lo que ve. */
function papelDe(cargo: Cargo, vpDe: Team[], teams: Team[]) {
  if (vpDe.length > 0) return `VP de ${vpDe.map((t) => TEAM_LABEL[t]).join(" + ")}`;
  if (cargo) return CARGO_LABEL[cargo];
  if (teams.length > 0) return teams.map((t) => TEAM_LABEL[t]).join(" + ");
  return "Equipo";
}

export function EquipoSidebar({
  seccion,
  onSeccion,
  teams,
  vpDe,
  cargo,
  nombre,
  email,
  tieneAccesoAdmin,
  onLogout,
  isLoggingOut,
}: Props) {
  const { state, isMobile, setOpenMobile } = useSidebar();

  const ayuda = (label: string) => (state === "collapsed" ? label : undefined);
  const esBoardOVp = cargo === "presidente" || cargo === "boardmember" || vpDe.length > 0;
  const tienePresupuesto = equiposConPanel("presupuesto", teams).length > 0;

  function elegir(id: Seccion) {
    onSeccion(id);
    if (isMobile) setOpenMobile(false);
  }

  const items = seccionesDe(teams);
  // Métricas, Presupuesto y el panel de administración son herramientas de
  // gestión, no de trabajo diario: un solo grupo "Admin" en vez de mezclarlas
  // con Tareas/Proyectos/Miembros o repartirlas sueltas por el sidebar.
  const itemsAdmin: Item[] = [
    ...(esBoardOVp ? [{ id: "metricas" as const, label: "Métricas", icono: BarChart3 }] : []),
    ...(tienePresupuesto
      ? [{ id: "presupuesto" as const, label: "Presupuesto", icono: Wallet }]
      : []),
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="workspace-marca-react">
          <img src="/logo.png" alt="" className="workspace-marca-logo-react" />
          <span className="workspace-marca-texto-react">
            <strong>TelecoEmprende</strong>
            <span>{cargo ? CARGO_LABEL[cargo] : "Equipo"}</span>
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <nav aria-label="Secciones de /equipo">
          <SidebarGroup>
            <SidebarGroupLabel>Club</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map(({ id, label, icono: Icono }) => (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton
                      isActive={seccion === id}
                      aria-current={seccion === id ? "page" : undefined}
                      onClick={() => elegir(id)}
                      tooltip={ayuda(label)}
                    >
                      <Icono />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {itemsAdmin.length > 0 || tieneAccesoAdmin ? (
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {itemsAdmin.map(({ id, label, icono: Icono }) => (
                    <SidebarMenuItem key={id}>
                      <SidebarMenuButton
                        isActive={seccion === id}
                        aria-current={seccion === id ? "page" : undefined}
                        onClick={() => elegir(id)}
                        tooltip={ayuda(label)}
                      >
                        <Icono />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  {tieneAccesoAdmin ? (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip={ayuda("Panel admin")}>
                        <Link to="/admin">
                          <Settings />
                          <span>Panel admin</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ) : null}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null}
        </nav>
      </SidebarContent>

      <SidebarFooter>
        {email ? (
          <div className="workspace-perfil-react">
            <AvatarResponsable email={email} nombre={nombre} className="crm-av" />
            <span className="workspace-perfil-texto-react">
              <strong>{etiquetaDe(email, nombre)}</strong>
              <span>{papelDe(cargo, vpDe, teams)}</span>
            </span>
          </div>
        ) : null}

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={ayuda("Ver la web")}>
              <Link to="/">
                <ExternalLink />
                <span>Ver la web</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {teams.includes("ingenieria") ? (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={ayuda("GitHub")}>
                <a href={GITHUB_REPO} target="_blank" rel="noreferrer noopener">
                  <GitBranch />
                  <span>GitHub</span>
                  <span className="sr-only">(se abre en otra pestaña)</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={ayuda("Cerrar sesión")}
              onClick={onLogout}
              disabled={isLoggingOut}
            >
              <LogOut />
              <span>{isLoggingOut ? "Saliendo..." : "Cerrar sesión"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
