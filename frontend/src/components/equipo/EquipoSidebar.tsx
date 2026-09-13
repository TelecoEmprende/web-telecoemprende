import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  ExternalLink,
  FolderOpen,
  Handshake,
  Home,
  KanbanSquare,
  LogOut,
  Megaphone,
  Megaphone as Anuncio,
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
import type { Cargo, Team } from "../../types/equipo";

/** Una entrada de la navegación: un panel, no un par departamento+panel. Antes
 *  cada departamento repetía su propio "Tareas"/"Campañas"/"Miembros" en el
 *  sidebar; ahora hay una sola entrada por panel y, si la persona pertenece a
 *  más de un departamento que lo tiene, un selector dentro del panel decide
 *  cuál se ve (ver `EquipoPage.tsx`, `equiposConPanel`). */
type Item = { id: Seccion; label: string; icono: LucideIcon };

export type Panel =
  | "tareas"
  | "campanas"
  | "miembros"
  | "recursos"
  | "presupuesto"
  | "reuniones"
  | "alumni";

export type Seccion = "club" | "metricas" | "calendario" | "anuncios" | Panel;

/** Qué panel tiene cada departamento. Los tres comparten Tareas, Recursos y
 *  Miembros; Campañas es de Marketing/Eventos (Ingeniería no tiene, ver
 *  `docs/CLAUDE.md`); Presupuesto es de quien mueve dinero (Eventos) y Alumni
 *  de Ingeniería. Esto decide qué panel aparece cuando (`seccionesDe`) y qué
 *  departamentos ofrece su selector interno (`equiposConPanel`) -- no hay ya
 *  un grupo de sidebar por departamento que mantener en paralelo. */
const PANELES_POR_EQUIPO: Record<Team, Panel[]> = {
  marketing: ["campanas", "tareas", "recursos", "miembros"],
  eventos: ["campanas", "tareas", "recursos", "presupuesto", "reuniones", "miembros"],
  ingenieria: ["tareas", "alumni", "reuniones", "recursos", "miembros"],
};

const ICONO: Record<Panel, LucideIcon> = {
  campanas: Megaphone,
  tareas: KanbanSquare,
  miembros: Users,
  recursos: FolderOpen,
  presupuesto: Wallet,
  reuniones: Users2,
  alumni: Handshake,
};

/** Etiqueta genérica del panel para el sidebar (un solo nombre, no uno por
 *  departamento). El vocabulario propio de un departamento (Eventos llama
 *  "Eventos" a sus campañas y "Gestiones" a sus tareas) se enseña dentro del
 *  panel mismo, en el título de la página (ver `tituloDe` en EquipoPage.tsx),
 *  no aquí -- así el sidebar no repite ni renombra la misma entrada. */
const ETIQUETA_PANEL: Record<Panel, string> = {
  campanas: "Proyectos",
  tareas: "Tareas",
  miembros: "Miembros",
  recursos: "Recursos",
  presupuesto: "Presupuesto",
  reuniones: "Reuniones",
  alumni: "Red Alumni",
};

/** Qué departamentos de la persona tienen este panel -- para el selector
 *  interno del panel (un desplegable/pestañas) cuando hay más de uno. */
export function equiposConPanel(panel: Panel, teams: Team[]): Team[] {
  return teams.filter((t) => PANELES_POR_EQUIPO[t].includes(panel));
}

/** El vocabulario propio de un departamento para un panel, o la etiqueta
 *  genérica si no tiene uno especial. Se usa para el título de la página
 *  cuando el panel está mostrando un único departamento concreto. */
export function etiquetaDeDepto(panel: Panel, depto: Team | null): string {
  if (depto === "eventos") {
    if (panel === "campanas") return "Eventos";
    if (panel === "tareas") return "Gestiones";
  }
  return ETIQUETA_PANEL[panel];
}

/** Todas las secciones visibles para esa persona, en el orden del sidebar --
 *  primero lo del boceto (Mi semana, Tareas, Proyectos, Calendario, Miembros,
 *  Avisos), luego lo que no sale ahí porque es de un departamento concreto
 *  (Recursos, Presupuesto, Reuniones, Alumni).
 *
 *  `deptoActivo` decide el rótulo de Tareas/Proyectos cuando quien pertenece
 *  a un solo departamento con vocabulario propio (Eventos: "Gestiones") lo
 *  quiere ver escrito así, no con el nombre genérico -- si tiene varios, el
 *  rótulo sigue al que esté activo en el selector interno del panel (ver
 *  `EquipoPage.tsx`), no a uno fijo por persona. */
export function seccionesDe(
  teams: Team[], esBoardOVp = false, deptoActivo: Team | null = null,
): Item[] {
  const paneles = new Set<Panel>(teams.flatMap((t) => PANELES_POR_EQUIPO[t]));
  const referencia = deptoActivo ?? teams[0] ?? null;
  const item = (id: Panel): Item[] =>
    paneles.has(id)
      ? [{ id, label: etiquetaDeDepto(id, referencia), icono: ICONO[id] }]
      : [];

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
    ...(esBoardOVp ? [{ id: "metricas" as const, label: "Métricas", icono: BarChart3 }] : []),
    ...item("recursos"),
    ...item("presupuesto"),
    ...item("reuniones"),
    ...item("alumni"),
  ];
}

const CARGO_LABEL: Record<Exclude<Cargo, "">, string> = {
  presidente: "Presidente",
  boardmember: "Board member",
};

type Props = {
  seccion: Seccion;
  onSeccion: (seccion: Seccion) => void;
  teams: Team[];
  vpDe: Team[];
  cargo: Cargo;
  /** Departamento activo del panel compartido que se está viendo (o el
   *  primero de la persona si ninguno) -- decide el rótulo de Tareas/
   *  Proyectos cuando un departamento tiene vocabulario propio. */
  deptoActivo: Team | null;
  tieneAccesoAdmin: boolean;
  onLogout: () => void;
  isLoggingOut: boolean;
};

export function EquipoSidebar({
  seccion,
  onSeccion,
  teams,
  vpDe,
  cargo,
  deptoActivo,
  tieneAccesoAdmin,
  onLogout,
  isLoggingOut,
}: Props) {
  const { state, isMobile, setOpenMobile } = useSidebar();

  const ayuda = (label: string) => (state === "collapsed" ? label : undefined);
  const esBoardOVp = cargo === "presidente" || cargo === "boardmember" || vpDe.length > 0;

  function elegir(id: Seccion) {
    onSeccion(id);
    if (isMobile) setOpenMobile(false);
  }

  const items = seccionesDe(teams, esBoardOVp, deptoActivo);

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

          {tieneAccesoAdmin ? (
            <SidebarGroup>
              <SidebarGroupLabel>Ingeniería</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={ayuda("Panel admin")}>
                      <Link to="/admin">
                        <Settings />
                        <span>Panel admin</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null}
        </nav>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={ayuda("Ver la web")}>
              <Link to="/">
                <ExternalLink />
                <span>Ver la web</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
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
