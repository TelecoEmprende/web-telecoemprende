import { CalendarDays, ClipboardList, ExternalLink, LogOut, Users } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";

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
} from "../../components/ui/sidebar";

/** Las tres vistas del panel. Es la única lista: de aquí salen el sidebar,
 *  el título de la barra superior (`tituloDe`) y las rutas de `adminRoutes`. */
export const NAV = [
  { ruta: "inscripciones", label: "Inscripciones", icono: ClipboardList },
  { ruta: "equipo", label: "Accesos de equipo", icono: Users },
  { ruta: "calendario", label: "Calendario", icono: CalendarDays },
] as const;

export function tituloDe(pathname: string): string {
  return NAV.find((item) => pathname.startsWith(`/admin/${item.ruta}`))?.label ?? "Panel";
}

type Props = {
  onLogout: () => void;
  isLoggingOut: boolean;
};

export function AdminSidebar({ onLogout, isLoggingOut }: Props) {
  const { pathname } = useLocation();
  const { state, isMobile, setOpenMobile } = useSidebar();

  // Igual que en /equipo: el tooltip solo aporta con el sidebar plegado a
  // iconos, expandido repetiría la etiqueta que ya se lee.
  const ayuda = (label: string) => (state === "collapsed" ? label : undefined);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="workspace-marca-react">
          <img src="/logo.png" alt="" className="workspace-marca-logo-react" />
          <span className="workspace-marca-texto-react">
            <strong>TelecoEmprende</strong>
            <span>Admin</span>
          </span>
        </div>
      </SidebarHeader>

      {/* El Sidebar de shadcn es un <div>: sin este <nav> no hay landmark de
          navegación al que saltar con lector de pantalla. */}
      <SidebarContent>
        <nav aria-label="Secciones de /admin">
          <SidebarGroup>
            <SidebarGroupLabel>Panel</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map(({ ruta, label, icono: Icono }) => {
                  const activo = pathname.startsWith(`/admin/${ruta}`);
                  return (
                    <SidebarMenuItem key={ruta}>
                      <SidebarMenuButton
                        asChild
                        isActive={activo}
                        tooltip={ayuda(label)}
                        // En móvil el sidebar es un cajón que no se cierra solo
                        // al elegir: harían falta dos toques para ver la vista.
                        onClick={() => isMobile && setOpenMobile(false)}
                      >
                        <NavLink to={ruta} aria-current={activo ? "page" : undefined}>
                          <Icono />
                          <span>{label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </nav>
      </SidebarContent>

      {/* Sin cabecera del sitio en el workspace: la salida a la web pública,
          el camino a /equipo y el cierre de sesión viven aquí. */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={ayuda("Panel de equipo")}>
              <Link to="/equipo">
                <Users />
                <span>Panel de equipo</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
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
              <span>{isLoggingOut ? "Cerrando..." : "Cerrar sesión"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
