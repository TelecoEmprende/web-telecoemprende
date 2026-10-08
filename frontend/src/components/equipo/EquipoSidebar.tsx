import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  CalendarCog,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  History,
  FolderKanban,
  Home,
  KanbanSquare,
  LogOut,
  NotebookPen,
  UserCog,
  Users,
  MessagesSquare,
  Wallet,
  Wrench,
} from "lucide-react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { SPRING_DEFAULT } from "@/components/smoothui/lib/animation";

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
import { LogoGithub } from "./LogosMarca";
import { AvatarResponsable, etiquetaDe } from "./marketing/Avatares";
import { getEquipoCalendario, getEventosLuma, getMisTareas } from "../../api/equipo";
import { listarNotas } from "../../api/notas";
import { CARGO_LABEL, DEPTO_LABEL, GITHUB_REPO, type Cargo, type Team } from "../../types/equipo";

/** El próximo evento, venga del calendario del club o de Luma. */
type Proximo = { titulo: string; fecha: string; hora: string; url: string };

/** Una entrada de la navegación: un panel, no un par departamento+panel. Antes
 *  cada departamento repetía su propio "Tareas"/"Campañas"/"Miembros" en el
 *  sidebar; ahora hay una sola entrada por panel, siempre con la misma
 *  etiqueta -- el filtro de departamento (checkboxes dentro del panel, ver
 *  `EquipoPage.tsx`) no toca nunca el sidebar. */
type Item = { id: Seccion; label: string; icono: LucideIcon; grupo: Grupo };

/** Los grupos del sidebar, en orden. "Más" va plegado: es lo que solo usa un
 *  departamento y no hace falta ver cada día. */
export type Grupo = "Inicio" | "Trabajo" | "Club" | "Más";
const GRUPOS: Grupo[] = ["Inicio", "Trabajo", "Club", "Más"];

export type Panel =
  | "tareas"
  | "campanas"
  | "miembros"
  | "presupuesto"
  | "reuniones";

export type Seccion =
  | "club" | "notas" | "herramientas" | "metricas" | "calendario" | Panel
  // Lo que antes era /admin: solo con `tieneAccesoAdmin` (Ingeniería y board).
  | "inscripciones" | "cuentas" | "calendario-club" | "auditoria";

/** Qué panel tiene cada departamento. Los tres comparten Tareas y Miembros; Campañas es de Marketing/Eventos (Ingeniería no tiene);
 *  Presupuesto es de quien mueve dinero (Eventos); lo propio de
 *  Ingeniería (Plataforma y Servicios) vive en Herramientas. Esto decide qué panel aparece
 *  (`seccionesDe`) y qué departamentos ofrece el filtro dentro de cada uno
 *  (`equiposConPanel`). */
const PANELES_POR_EQUIPO: Record<Team, Panel[]> = {
  marketing: ["campanas", "tareas", "miembros"],
  eventos: ["campanas", "tareas", "presupuesto", "reuniones", "miembros"],
  // Proyectos es el mismo para los tres: mismo panel, mismo vocabulario.
  ingenieria: ["campanas", "tareas", "reuniones", "miembros"],
};

const ICONO: Record<Panel, LucideIcon> = {
  campanas: FolderKanban,
  tareas: KanbanSquare,
  miembros: Users,
  presupuesto: Wallet,
  // Distinto del de Miembros: una reunión es una conversación, no gente.
  reuniones: MessagesSquare,
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
  presupuesto: "Presupuesto",
  reuniones: "Reuniones",
};

/** Qué departamentos de la persona tienen este panel -- para el filtro
 *  interno del panel (checkboxes) cuando hay más de uno. */
export function equiposConPanel(panel: Panel, teams: Team[]): Team[] {
  return teams.filter((t) => PANELES_POR_EQUIPO[t].includes(panel));
}

/** Todas las secciones visibles para esa persona, en el orden del sidebar y
 *  con su grupo: Inicio (lo personal: resumen y notas), Trabajo
 *  (tareas, proyectos, calendario), Club (gente, reuniones, herramientas)
 *  y Más (lo propio de un solo departamento). Métricas y Presupuesto no están
 *  aquí -- son del grupo "Admin" (ver `EquipoSidebar`). */
export function seccionesDe(teams: Team[]): Item[] {
  const paneles = new Set<Panel>(teams.flatMap((t) => PANELES_POR_EQUIPO[t]));
  const item = (id: Panel, grupo: Grupo): Item[] =>
    paneles.has(id) ? [{ id, label: ETIQUETA_PANEL[id], icono: ICONO[id], grupo }] : [];
  const conEquipo = teams.length > 0;

  return [
    { id: "club", label: "Inicio", icono: Home, grupo: "Inicio" },
    { id: "notas", label: "Notas", icono: NotebookPen, grupo: "Inicio" },
    ...item("tareas", "Trabajo"),
    ...item("campanas", "Trabajo"),
    ...(conEquipo
      ? [{ id: "calendario" as const, label: "Calendario", icono: CalendarDays, grupo: "Trabajo" as const }]
      : []),
    ...item("miembros", "Club"),
    ...item("reuniones", "Club"),
    { id: "herramientas", label: "Herramientas", icono: Wrench, grupo: "Club" },
  ];
}



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
  if (vpDe.length > 0) return `VP de ${vpDe.map((t) => DEPTO_LABEL[t]).join(" + ")}`;
  if (cargo) return CARGO_LABEL[cargo];
  if (teams.length > 0) return teams.map((t) => DEPTO_LABEL[t]).join(" + ");
  return "Equipo";
}

/** "Mar 14 oct · 18:00" para la tarjeta del próximo evento. */
function cuandoEvento(fecha: string, hora: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const texto = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short" })
    .format(new Date(anio, mes - 1, dia));
  return hora ? `${texto} · ${hora}` : texto;
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
  const menosMovimiento = useReducedMotion();
  const [masAbierto, setMasAbierto] = useState(false);
  const [cuentas, setCuentas] = useState<Partial<Record<Seccion, number>>>({});
  const [proximo, setProximo] = useState<Proximo | null>(null);

  const ayuda = (label: string) => (state === "collapsed" ? label : undefined);
  const esBoardOVp = cargo !== "" || vpDe.length > 0;
  const tienePresupuesto = equiposConPanel("presupuesto", teams).length > 0;

  // Los numeritos de al lado (tareas abiertas, notas) y la tarjeta del
  // próximo evento. Se vuelven a pedir al cambiar de sección: es cuando lo
  // que hay detrás ha podido cambiar (se cerró una tarea, se creó una nota).
  useEffect(() => {
    let activo = true;
    getMisTareas()
      .then((r) => {
        if (activo && r.ok) {
          const abiertas = r.tareas.filter((t) => t.estado !== "acabado").length;
          setCuentas((c) => ({ ...c, tareas: abiertas }));
        }
      })
      .catch(() => {
        // Sin cuenta, la entrada sale sin numerito.
      });
    listarNotas()
      .then((r) => {
        if (activo && r.ok) setCuentas((c) => ({ ...c, notas: r.notas.length }));
      })
      .catch(() => {
        // Sin cuenta, la entrada sale sin numerito.
      });
    return () => {
      activo = false;
    };
  }, [seccion]);

  useEffect(() => {
    let activo = true;
    const dos = (n: number) => String(n).padStart(2, "0");
    Promise.allSettled([getEquipoCalendario(), getEventosLuma()]).then(([club, luma]) => {
      if (!activo) return;
      const ahora = new Date();
      const hoy = `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`;
      const candidatos: Proximo[] = [];
      if (club.status === "fulfilled" && club.value.ok) {
        for (const e of club.value.eventos) {
          if (e.fecha >= hoy) candidatos.push({ titulo: e.titulo, fecha: e.fecha, hora: e.hora, url: "" });
        }
      }
      if (luma.status === "fulfilled" && luma.value.ok) {
        for (const e of luma.value.eventos) {
          const d = new Date(e.inicio);
          candidatos.push({
            titulo: e.titulo,
            fecha: `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`,
            hora: `${dos(d.getHours())}:${dos(d.getMinutes())}`,
            url: e.url || luma.value.calendario,
          });
        }
      }
      candidatos.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
      setProximo(candidatos[0] ?? null);
    });
    return () => {
      activo = false;
    };
  }, []);

  function elegir(id: Seccion) {
    onSeccion(id);
    if (isMobile) setOpenMobile(false);
  }

  const items = seccionesDe(teams);
  // Métricas, Presupuesto y el panel de administración son herramientas de
  // gestión, no de trabajo diario: un solo grupo "Admin" en vez de mezclarlas
  // con Tareas/Proyectos/Miembros o repartirlas sueltas por el sidebar.
  const itemsAdmin: Omit<Item, "grupo">[] = [
    ...(esBoardOVp ? [{ id: "metricas" as const, label: "Métricas", icono: BarChart3 }] : []),
    ...(tienePresupuesto
      ? [{ id: "presupuesto" as const, label: "Presupuesto", icono: Wallet }]
      : []),
    ...(tieneAccesoAdmin
      ? [
          { id: "inscripciones" as const, label: "Inscripciones", icono: ClipboardList },
          { id: "cuentas" as const, label: "Cuentas del equipo", icono: UserCog },
          { id: "calendario-club" as const, label: "Calendario del club", icono: CalendarCog },
          { id: "auditoria" as const, label: "Auditoría", icono: History },
        ]
      : []),
  ];

  /** Una entrada. La píldora del activo es UNA sola (`layoutId`) que se
   *  desliza de una entrada a otra en vez de apagarse aquí y encenderse
   *  allí: así se ve de dónde vienes y a dónde vas. */
  const boton = ({ id, label, icono: Icono }: Omit<Item, "grupo">) => {
    const activo = seccion === id;
    const cuenta = cuentas[id];
    return (
      <SidebarMenuItem key={id}>
        <SidebarMenuButton
          isActive={activo}
          aria-current={activo ? "page" : undefined}
          onClick={() => elegir(id)}
          tooltip={ayuda(label)}
          className="workspace-item-react"
        >
          {activo ? (
            <motion.span
              layoutId="workspace-activo"
              className="workspace-activo-react"
              aria-hidden="true"
              transition={menosMovimiento ? { duration: 0 } : SPRING_DEFAULT}
            />
          ) : null}
          <Icono />
          <span>{label}</span>
          {cuenta ? <span className="workspace-cuenta-react">{cuenta}</span> : null}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar
      collapsible="icon"
      variant="floating"
      // En móvil el sidebar se pinta en un portal fuera del workspace: sin
      // estas clases se queda sin los colores ni las utilidades de Tailwind.
      className={isMobile ? "shadcn-scope crm-sidebar-react" : "crm-sidebar-react"}
    >
      <SidebarHeader>
        <div className="workspace-marca-react">
          {/* El logo en una sola tinta (Azul TE): ver `.workspace-marca-logo-react`. */}
          <span className="workspace-marca-logo-react" aria-hidden="true" />
          <span className="workspace-marca-texto-react">
            <strong>TelecoEmprende</strong>
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <nav aria-label="Secciones de /equipo">
          <LayoutGroup>
            {GRUPOS.map((grupo) => {
              const delGrupo = items.filter((i) => i.grupo === grupo);
              if (delGrupo.length === 0) return null;
              if (grupo === "Más") {
                return (
                  <Collapsible
                    key={grupo}
                    open={masAbierto || state === "collapsed" || delGrupo.some((i) => i.id === seccion)}
                    onOpenChange={setMasAbierto}
                    asChild
                  >
                    <SidebarGroup>
                      <SidebarGroupLabel asChild>
                        <CollapsibleTrigger className="workspace-grupo-plegable-react">
                          Más
                          <ChevronRight aria-hidden="true" />
                        </CollapsibleTrigger>
                      </SidebarGroupLabel>
                      <CollapsibleContent>
                        <SidebarGroupContent>
                          <SidebarMenu>{delGrupo.map(boton)}</SidebarMenu>
                        </SidebarGroupContent>
                      </CollapsibleContent>
                    </SidebarGroup>
                  </Collapsible>
                );
              }
              return (
                <SidebarGroup key={grupo}>
                  {/* El primer grupo no lleva rótulo, como en el boceto:
                      Inicio y Notas son la puerta de entrada, no una sección. */}
                  {grupo === "Inicio" ? null : <SidebarGroupLabel>{grupo}</SidebarGroupLabel>}
                  <SidebarGroupContent>
                    <SidebarMenu>{delGrupo.map(boton)}</SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            })}

            {itemsAdmin.length > 0 ? (
              <SidebarGroup>
                <SidebarGroupLabel>Admin</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {itemsAdmin.map(boton)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : null}
          </LayoutGroup>
        </nav>
      </SidebarContent>

      <SidebarFooter>
        {proximo ? (
          <div className="workspace-evento-react">
            <div className="workspace-evento-cabecera-react">
              <span className="workspace-evento-icono-react" aria-hidden="true">
                <CalendarDays />
              </span>
              <span className="workspace-evento-texto-react">
                <strong>{proximo.titulo}</strong>
                <span>{cuandoEvento(proximo.fecha, proximo.hora)}</span>
              </span>
            </div>
            {proximo.url ? (
              <a
                className="workspace-evento-boton-react"
                href={proximo.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                Apuntarme en Luma
                <ChevronRight aria-hidden="true" />
              </a>
            ) : (
              <button type="button" className="workspace-evento-boton-react" onClick={() => elegir("calendario")}>
                Ver calendario
                <ChevronRight aria-hidden="true" />
              </button>
            )}
          </div>
        ) : null}

        <div className="workspace-perfil-react">
            {email ? <AvatarResponsable email={email} nombre={nombre} className="crm-av" /> : null}
            <span className="workspace-perfil-texto-react">
              <strong>{email ? etiquetaDe(email, nombre) : nombre || "Equipo"}</strong>
              <span>{papelDe(cargo, vpDe, teams)}</span>
            </span>
            <span className="workspace-perfil-acciones-react">
              <Link to="/" className="workspace-icono-react" title="Ver la web">
                <ExternalLink aria-hidden="true" />
                <span className="sr-only">Ver la web</span>
              </Link>
              {teams.includes("ingenieria") ? (
                <a
                  href={GITHUB_REPO}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="workspace-icono-react"
                  title="GitHub"
                >
                  <LogoGithub />
                  <span className="sr-only">GitHub (se abre en otra pestaña)</span>
                </a>
              ) : null}
              <button
                type="button"
                className="workspace-icono-react"
                title="Cerrar sesión"
                onClick={onLogout}
                disabled={isLoggingOut}
              >
                <LogOut aria-hidden="true" />
                <span className="sr-only">{isLoggingOut ? "Saliendo..." : "Cerrar sesión"}</span>
              </button>
            </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
