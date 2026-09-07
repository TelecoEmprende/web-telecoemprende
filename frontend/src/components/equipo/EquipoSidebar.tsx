import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ExternalLink,
  FolderOpen,
  Handshake,
  Home,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Megaphone as Anuncio,
  PartyPopper,
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

/** Una entrada de la navegación. El id identifica la sección abierta en todo
 *  `/equipo`: al ser plano (`mkt-tareas`, no `marketing` + `tareas`) el estado
 *  del shell es una sola cadena y no un par que hay que mantener coherente. */
type Item = { id: Seccion; label: string; icono: LucideIcon };

/** Prefijo de las secciones de cada departamento. Marketing y Eventos tienen
 *  el mismo juego de paneles (ver `DeptoDashboard`), así que sus secciones se
 *  generan en vez de escribirse dos veces. */
const PREFIJO: Record<Team, string> = {
  marketing: "mkt",
  eventos: "ev",
  ingenieria: "ing",
};

export function prefijoDe(team: Team): string {
  return PREFIJO[team];
}

type Panel =
  | "home"
  | "campanas"
  | "tareas"
  | "calendario"
  | "miembros"
  | "recursos"
  | "presupuesto"
  | "anuncios"
  | "reuniones"
  | "alumni";

export type Seccion = "club" | `${"mkt" | "ev" | "ing"}-${Panel}`;

const CLUB: Item[] = [
  { id: "club", label: "Inicio", icono: Home },
  // Los anuncios son del club entero (el backend no los acota por
  // departamento), pero se piden por la ruta de uno: se cuelgan del primer
  // departamento de la persona, ver `seccionesDe`.
];

/** Qué paneles tiene cada departamento. Los cinco de siempre los tienen todos;
 *  Presupuesto es de quien mueve dinero (Eventos) y Alumni de Ingeniería. */
const PANELES_POR_EQUIPO: Record<Team, Panel[]> = {
  marketing: ["home", "campanas", "tareas", "calendario", "recursos", "miembros"],
  eventos: [
    "home", "campanas", "tareas", "calendario",
    "recursos", "presupuesto", "reuniones", "miembros",
  ],
  ingenieria: [
    "home", "tareas", "calendario", "alumni", "reuniones", "recursos", "miembros",
  ],
};

const ICONO: Record<Panel, LucideIcon> = {
  home: LayoutDashboard,
  campanas: Megaphone,
  tareas: KanbanSquare,
  calendario: CalendarDays,
  miembros: Users,
  recursos: FolderOpen,
  presupuesto: Wallet,
  anuncios: Anuncio,
  reuniones: Users2,
  alumni: Handshake,
};

/** Algunos paneles se llaman distinto según el departamento: en Eventos las
 *  campañas son eventos y las tareas son gestiones, que es como se habla ahí. */
function etiquetaPanel(team: Team, panel: Panel): string {
  if (team === "eventos") {
    if (panel === "campanas") return "Eventos";
    if (panel === "tareas") return "Gestiones";
  }
  return {
    home: "Resumen",
    campanas: "Campañas",
    tareas: "Tareas",
    calendario: "Calendario",
    miembros: "Miembros",
    recursos: "Recursos",
    presupuesto: "Presupuesto",
    anuncios: "Anuncios",
    reuniones: "Reuniones",
    alumni: "Red Alumni",
  }[panel];
}

function panelesDe(team: Team): Item[] {
  const p = PREFIJO[team];
  return PANELES_POR_EQUIPO[team].map((panel) => ({
    id: `${p}-${panel}` as Seccion,
    label: etiquetaPanel(team, panel),
    icono: panel === "campanas" && team === "eventos" ? PartyPopper : ICONO[panel],
  }));
}

/** Secciones que aporta cada departamento. Quien no esté en un departamento
 *  no ve su grupo: la navegación sale de la sesión, no de una lista fija. */
const POR_EQUIPO: Record<Team, Item[]> = {
  marketing: panelesDe("marketing"),
  eventos: panelesDe("eventos"),
  // Ingeniería ya tiene workspace propio (Alumni, Reuniones). El enlace a
  // `/admin` sigue apareciendo aparte, ver `tieneAccesoAdmin`.
  ingenieria: panelesDe("ingenieria"),
};

/** Departamento (como `Team`) al que pertenece una sección, o null si es del
 *  club. Sale del prefijo y no de buscar en `POR_EQUIPO`, porque Anuncios se
 *  sirve por la ruta de un departamento sin ser uno de sus paneles. */
export function teamDe(seccion: Seccion): Team | null {
  const prefijo = seccion.split("-")[0];
  return (
    (Object.keys(PREFIJO) as Team[]).find((t) => PREFIJO[t] === prefijo) ?? null
  );
}

const TEAM_LABEL: Record<Team, string> = {
  marketing: "Marketing",
  eventos: "Eventos",
  ingenieria: "Ingeniería",
};

const CARGO_LABEL: Record<Exclude<Cargo, "">, string> = {
  presidente: "Presidente",
  boardmember: "Board member",
};

/** Todas las secciones visibles para esa persona, en el orden del sidebar.
 *  El shell lo usa para saber en qué sección abrir y cómo titular la barra. */
export function seccionesDe(teams: Team[]): Item[] {
  return [...clubDe(teams), ...teams.flatMap((team) => POR_EQUIPO[team] ?? [])];
}

/** El grupo "Club": el inicio, y los anuncios si la persona está en algún
 *  departamento (la ruta de anuncios cuelga de uno, aunque el contenido sea
 *  del club entero). */
export function clubDe(teams: Team[]): Item[] {
  if (teams.length === 0) return CLUB;
  return [
    ...CLUB,
    {
      id: `${PREFIJO[teams[0]]}-anuncios` as Seccion,
      label: "Anuncios",
      icono: Anuncio,
    },
  ];
}

/** El rótulo de la barra: el departamento, o "Club" para lo que es de todos. */
export function deptoDe(seccion: Seccion): string {
  if (seccion === "club" || seccion.endsWith("-anuncios")) return "Club";
  const team = teamDe(seccion);
  return team ? TEAM_LABEL[team] : "Club";
}

type Props = {
  seccion: Seccion;
  onSeccion: (seccion: Seccion) => void;
  teams: Team[];
  /** Subconjunto de `teams` donde la persona es VP. */
  vpDe: Team[];
  cargo: Cargo;
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
  tieneAccesoAdmin,
  onLogout,
  isLoggingOut,
}: Props) {
  const { state, isMobile, setOpenMobile } = useSidebar();

  // El tooltip solo tiene sentido con el sidebar plegado a iconos: expandido
  // repetiría una etiqueta que ya se lee. Y de paso quita el TooltipTrigger de
  // Radix de en medio, que se tragaba clics.
  const ayuda = (label: string) => (state === "collapsed" ? label : undefined);

  // En móvil el sidebar es un cajón (Sheet) que se queda abierto tras elegir
  // sección si no se cierra a mano: habría que tocar dos veces para ver el
  // panel elegido. En escritorio no hay cajón que cerrar.
  function elegir(id: Seccion) {
    onSeccion(id);
    if (isMobile) setOpenMobile(false);
  }

  function grupo(titulo: string, items: Item[], vp = false) {
    if (items.length === 0) return null;

    return (
      <SidebarGroup key={titulo}>
        <SidebarGroupLabel>
          {titulo}
          {vp ? " · VP" : ""}
        </SidebarGroupLabel>
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
    );
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="equipo-marca-react">
          <img src="/logo.png" alt="" className="equipo-marca-logo-react" />
          <span className="equipo-marca-texto-react">
            <strong>TelecoEmprende</strong>
            <span>{cargo ? CARGO_LABEL[cargo] : "Equipo"}</span>
          </span>
        </div>
      </SidebarHeader>

      {/* El Sidebar de shadcn es un <div>: sin este <nav> no hay landmark de
          navegación al que saltar con lector de pantalla. */}
      <SidebarContent>
        <nav aria-label="Secciones de /equipo">
          {grupo("Club", clubDe(teams))}

          {teams.map((team) =>
            grupo(TEAM_LABEL[team], POR_EQUIPO[team] ?? [], vpDe.includes(team)),
          )}

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

      {/* Con el workspace a pantalla completa no hay cabecera del sitio, así
          que la salida a la web pública y el cierre de sesión viven aquí. */}
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
