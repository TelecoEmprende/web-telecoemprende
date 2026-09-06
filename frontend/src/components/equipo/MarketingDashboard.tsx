import { useState } from "react";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  MarketingSidebar,
  SECCIONES,
  type Seccion,
} from "./marketing/MarketingSidebar";
import { CalendarPanel } from "./marketing/CalendarPanel";
import { CampaignsPanel } from "./marketing/CampaignsPanel";
import { MembersPanel } from "./marketing/MembersPanel";
import { TasksPanel } from "./marketing/TasksPanel";
import { WeekPanel } from "./marketing/WeekPanel";

/**
 * Espacio de trabajo de Marketing.
 *
 * Ocupa la pantalla entera: sidebar fijo al borde izquierdo y contenido a lo
 * ancho. La tarjeta centrada de `/equipo` se neutraliza desde `marketing.css`
 * con `:has(.mkt-react)` -- ni `EquipoPage.tsx` ni `equipo.css` se tocan, y en
 * cuanto se sale de Marketing el shell vuelve a comportarse como siempre.
 *
 * Cada sección se monta solo cuando se abre, así que entrar hace una petición
 * y no cinco.
 */
export function MarketingDashboard() {
  const [seccion, setSeccion] = useState<Seccion>("home");
  const [campaignInicial, setCampaignInicial] = useState<number | null>(null);

  function abrirCampaign(campaignId: number) {
    setCampaignInicial(campaignId);
    setSeccion("campanas");
  }

  const titulo = SECCIONES.find((s) => s.id === seccion)?.label ?? "";

  return (
    <div className="mkt-react">
      <SidebarProvider>
        <MarketingSidebar seccion={seccion} onSeccion={setSeccion} />

        <main className="mkt-main-react">
          <header className="mkt-barra-react">
            <SidebarTrigger />
            <h2>{titulo}</h2>
          </header>

          <div className="mkt-contenido-react">
            {seccion === "home" ? <WeekPanel /> : null}
            {seccion === "campanas" ? (
              <CampaignsPanel
                campaignInicial={campaignInicial}
                onCampaignAbierta={() => setCampaignInicial(null)}
              />
            ) : null}
            {seccion === "tareas" ? <TasksPanel /> : null}
            {seccion === "calendario" ? (
              <CalendarPanel onAbrirCampaign={abrirCampaign} />
            ) : null}
            {seccion === "miembros" ? <MembersPanel /> : null}
          </div>
        </main>
      </SidebarProvider>
    </div>
  );
}
