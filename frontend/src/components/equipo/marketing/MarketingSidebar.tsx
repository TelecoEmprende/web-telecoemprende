import { useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronsUpDown,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Users,
} from "lucide-react";

import { getEquipoSession, logoutEquipo } from "../../../api/equipo";
import type { Team } from "../../../types/equipo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export const SECCIONES = [
  { id: "home", label: "Home", icono: LayoutDashboard },
  { id: "campanas", label: "Campañas", icono: Megaphone },
  { id: "tareas", label: "Tareas", icono: KanbanSquare },
  { id: "calendario", label: "Calendario", icono: CalendarDays },
  { id: "miembros", label: "Miembros", icono: Users },
] as const;

export type Seccion = (typeof SECCIONES)[number]["id"];

const TEAM_LABEL: Record<Team, string> = {
  marketing: "Marketing",
  eventos: "Eventos",
  ingenieria: "Ingeniería",
};

type Props = {
  seccion: Seccion;
  onSeccion: (seccion: Seccion) => void;
};

/**
 * Selector de equipo en la cabecera del sidebar.
 *
 * Los equipos salen de la sesión (`/api/equipo/session`), no de una lista
 * escrita a mano: quien solo esté en Marketing verá solo Marketing.
 *
 * Cambiar de equipo recarga `/equipo`: qué equipo está abierto es estado de
 * EquipoPage, que es de otra persona, y una recarga lo devuelve a su selector
 * sin que este componente tenga que tocarlo.
 */
function SelectorDeEquipo() {
  const [equipos, setEquipos] = useState<Team[]>(["marketing"]);
  const { state } = useSidebar();

  useEffect(() => {
    let activo = true;
    getEquipoSession()
      .then((sesion) => {
        if (activo && sesion.teams.length > 0) setEquipos(sesion.teams);
      })
      .catch(() => {
        // Sin sesión legible se queda el valor por defecto: no merece un error
        // en pantalla por un desplegable.
      });
    return () => {
      activo = false;
    };
  }, []);

  const otros = equipos.filter((e) => e !== "marketing");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg" className="mkt-selector-react">
          <img src="/logo.png" alt="" className="mkt-marca-logo-react" />
          <span className="mkt-marca-texto-react">
            <strong>Marketing</strong>
            <span>TelecoEmprende</span>
          </span>
          <ChevronsUpDown className="mkt-selector-flecha-react" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side={state === "collapsed" ? "right" : "bottom"}
        className="w-56"
      >
        <DropdownMenuLabel>Tus equipos</DropdownMenuLabel>
        <DropdownMenuItem disabled>
          <Check />
          Marketing
        </DropdownMenuItem>
        {otros.map((equipo) => (
          <DropdownMenuItem
            key={equipo}
            onClick={() => {
              window.location.href = "/equipo";
            }}
          >
            {TEAM_LABEL[equipo]}
          </DropdownMenuItem>
        ))}
        {otros.length === 0 ? (
          <DropdownMenuItem disabled>Solo estás en Marketing</DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Sidebar del espacio de Marketing.
 *
 * Cuando este panel está abierto se lleva la pantalla entera, así que la
 * marca, "Inicio" y "Cerrar sesión" viven aquí: son las mismas acciones que
 * ofrece el shell de `/equipo`, que queda oculto mientras tanto (ver
 * `marketing.css`). No se tocan ni `EquipoPage.tsx` ni `equipo.css`.
 *
 * Volver al selector de equipos y cerrar sesión se hacen recargando `/equipo`:
 * el estado de qué equipo está abierto vive en EquipoPage, y una recarga lo
 * devuelve a su pantalla inicial sin que este componente tenga que conocerlo.
 */
export function MarketingSidebar({ seccion, onSeccion }: Props) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  // El tooltip solo tiene sentido con el sidebar plegado a iconos: expandido
  // repetiría una etiqueta que ya se lee. Y de paso quita el TooltipTrigger de
  // Radix de en medio, que se tragaba clics.
  const ayuda = (label: string) => (state === "collapsed" ? label : undefined);

  // En móvil el sidebar es un cajón (Sheet) que se queda abierto tras elegir
  // sección si no se cierra a mano: hay que tocar dos veces para ver el panel
  // elegido. En escritorio no hay cajón que cerrar, así que no hace nada.
  function elegirSeccion(id: Seccion) {
    onSeccion(id);
    if (isMobile) setOpenMobile(false);
  }

  async function cerrarSesion() {
    try {
      await logoutEquipo();
    } finally {
      window.location.href = "/equipo";
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SelectorDeEquipo />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Secciones</SidebarGroupLabel>
          <SidebarGroupContent>
            {/* El Sidebar de shadcn es un <div>: sin este <nav> no hay landmark
                de navegación al que saltar con lector de pantalla. */}
            <nav aria-label="Secciones de Marketing">
              <SidebarMenu>
                {SECCIONES.map(({ id, label, icono: Icono }) => (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton
                      isActive={seccion === id}
                      aria-current={seccion === id}
                      onClick={() => elegirSeccion(id)}
                      tooltip={ayuda(label)}
                    >
                      <Icono />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={ayuda("Cerrar sesión")}
              onClick={() => void cerrarSesion()}
            >
              <LogOut />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
