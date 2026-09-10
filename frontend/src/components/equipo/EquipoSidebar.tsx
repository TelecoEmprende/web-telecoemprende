import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ChevronRight,
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
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import type { Team } from "../../types/equipo";

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
  tieneAccesoAdmin: boolean;
  onLogout: () => void;
  isLoggingOut: boolean;
};

export function EquipoSidebar({
  seccion,
  onSeccion,
  teams,
  vpDe,
  tieneAccesoAdmin,
  onLogout,
  isLoggingOut,
}: Props) {
  const { state, isMobile, setOpenMobile } = useSidebar();

  // El tooltip solo tiene sentido con el sidebar plegado a iconos: expandido
  // repetiría una etiqueta que ya se lee. Y de paso quita el TooltipTrigger de
  // Radix de en medio, que se tragaba clics.
  const ayuda = (label: string) => (state === "collapsed" ? label : undefined);

  // Con dos o tres departamentos, la lista completa no cabe sin scroll y ni
  // siquiera se ve cuáles hay. Cada grupo de departamento se puede plegar a
  // solo su título; el del departamento donde se está arranca abierto, y se
  // reabre solo si `seccion` se mueve a otro (por ejemplo, un enlace directo).
  const [expandido, setExpandido] = useState<Set<Team>>(() => {
    // Al entrar por "Inicio" (`seccion` es "club") todavía no hay ningún
    // departamento activo: sin este `?? teams[0]`, los grupos arrancarían
    // todos plegados y ni el primer "Resumen" se vería sin tocar nada antes.
    const actual = teamDe(seccion) ?? teams[0] ?? null;
    return actual ? new Set([actual]) : new Set();
  });

  useEffect(() => {
    const actual = teamDe(seccion);
    if (!actual) return;
    setExpandido((previo) => (previo.has(actual) ? previo : new Set(previo).add(actual)));
  }, [seccion]);

  function alternar(team: Team) {
    setExpandido((previo) => {
      const siguiente = new Set(previo);
      if (siguiente.has(team)) siguiente.delete(team);
      else siguiente.add(team);
      return siguiente;
    });
  }

  // En móvil el sidebar es un cajón (Sheet) que se queda abierto tras elegir
  // sección si no se cierra a mano: habría que tocar dos veces para ver el
  // panel elegido. En escritorio no hay cajón que cerrar.
  function elegir(id: Seccion) {
    onSeccion(id);
    if (isMobile) setOpenMobile(false);
  }

  function contenidoDe(items: Item[]) {
    return (
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
    );
  }

  /** Sin `team` (el grupo Club), el grupo siempre está abierto: son dos
   *  enlaces, no hace falta plegarlos y es el punto de partida de todos. */
  function grupo(titulo: string, items: Item[], team: Team | null = null, vp = false) {
    if (items.length === 0) return null;

    if (team === null) {
      return (
        <SidebarGroup key={titulo}>
          <SidebarGroupLabel>{titulo}</SidebarGroupLabel>
          {contenidoDe(items)}
        </SidebarGroup>
      );
    }

    // Plegado a iconos no hay nada que plegar -- ya es solo una columna de
    // iconos -- así que se fuerza abierto y no se pierde nada al colapsar
    // el sidebar entero.
    const abierto = state === "collapsed" || expandido.has(team);

    return (
      <Collapsible key={titulo} open={abierto} onOpenChange={() => alternar(team)}>
        <SidebarGroup>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              // Nombre accesible distinto del texto visible a propósito: en
              // Eventos, la sección "Campañas" se llama "Eventos" igual que
              // el propio departamento, y sin esto los dos botones eran
              // indistinguibles por nombre para un lector de pantalla (y para
              // un test).
              aria-label={`Sección ${titulo}${vp ? " · VP" : ""}, plegar o desplegar`}
              // `bg-transparent`/`border-0` sin variante `hover:`, para que
              // apliquen siempre: el mini-reset de equipo.css (que no se
              // toca) deja de proteger este botón en :hover, y sin un fondo
              // propio ahí caía en el gris por defecto del navegador --
              // mismo bug que ya salió antes con las tarjetas de tarea.
              className="group/trigger flex h-8 w-full shrink-0 items-center justify-between rounded-md border-0 bg-transparent px-2 text-xs font-medium text-sidebar-foreground/70 outline-hidden hover:bg-sidebar-accent hover:text-sidebar-foreground group-data-[collapsible=icon]:hidden"
            >
              <span aria-hidden="true">
                {titulo}
                {vp ? " · VP" : ""}
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-3.5 shrink-0 transition-transform group-data-[state=open]/trigger:rotate-90"
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>{contenidoDe(items)}</CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="equipo-marca-react">
          <img src="/logo.png" alt="" className="equipo-marca-logo-react" />
          <span className="equipo-marca-texto-react">
            <strong>TelecoEmprende</strong>
          </span>
        </div>
      </SidebarHeader>

      {/* El Sidebar de shadcn es un <div>: sin este <nav> no hay landmark de
          navegación al que saltar con lector de pantalla. */}
      <SidebarContent>
        <nav aria-label="Secciones de /equipo">
          {grupo("Club", clubDe(teams))}

          {teams.map((team) =>
            grupo(TEAM_LABEL[team], POR_EQUIPO[team] ?? [], team, vpDe.includes(team)),
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
