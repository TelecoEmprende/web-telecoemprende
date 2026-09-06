import { useState } from "react";

import { Button } from "@/components/ui/button";
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
 * con `:has(.mkt-react)` -- ni `EquipoPage.tsx` ni `equipo.css` se tocan.
 *
 * Por eso no se monta directamente: para alguien con más de un departamento
 * (Marketing + Ingeniería, por ejemplo), `.mkt-react` existiendo ya de
 * entrada se comía su tarjeta de Ingeniería y el calendario compartido en
 * cuanto cargaba la página, sin haber pedido entrar a Marketing. Con esta
 * pantalla intermedia, `.mkt-react` no aparece en el DOM hasta que se pulsa
 * el botón -- el resto de `/equipo` se ve normal hasta entonces.
 */
export function MarketingDashboard() {
  const [entrado, setEntrado] = useState(false);
  const [seccion, setSeccion] = useState<Seccion>("home");
  const [campaignInicial, setCampaignInicial] = useState<number | null>(null);

  function abrirCampaign(campaignId: number) {
    setCampaignInicial(campaignId);
    setSeccion("campanas");
  }

  if (!entrado) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <p className="text-sm text-muted-foreground">
          Campañas, tareas y calendario del departamento de Marketing.
        </p>
        <Button onClick={() => setEntrado(true)}>Entrar a Marketing</Button>
      </div>
    );
  }

  const titulo = SECCIONES.find((s) => s.id === seccion)?.label ?? "";

  return (
    <div className="mkt-react">
      <SidebarProvider>
        <MarketingSidebar
          seccion={seccion}
          onSeccion={setSeccion}
          onSalir={() => setEntrado(false)}
        />

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
