import { useState } from "react";

import type { Seccion } from "./EquipoSidebar";
import { CalendarPanel } from "./marketing/CalendarPanel";
import { CampaignsPanel } from "./marketing/CampaignsPanel";
import { MembersPanel } from "./marketing/MembersPanel";
import { TasksPanel } from "./marketing/TasksPanel";
import { WeekPanel } from "./marketing/WeekPanel";

type Props = {
  seccion: Seccion;
  onSeccion: (seccion: Seccion) => void;
};

/**
 * Paneles del departamento de Marketing.
 *
 * Ya no monta shell propio: el sidebar, la barra y el área de trabajo son de
 * `/equipo` (ver `EquipoPage.tsx`), y este componente solo decide qué panel
 * toca. Antes se llevaba la pantalla entera tapando el shell desde
 * `marketing.css` con `:has()`, y necesitaba una pantalla intermedia
 * ("Entrar a Marketing") para que esos `:has()` no se comieran el resto de
 * `/equipo` nada más cargar. Con el shell compartido, nada de eso hace falta.
 */
export function MarketingDashboard({ seccion, onSeccion }: Props) {
  const [campaignInicial, setCampaignInicial] = useState<number | null>(null);

  /** Desde el calendario se salta a la campaña del elemento tocado, para que
   *  no sea un callejón sin salida. La sección la manda el shell. */
  function abrirCampaign(campaignId: number) {
    setCampaignInicial(campaignId);
    onSeccion("mkt-campanas");
  }

  return (
    <>
      {seccion === "mkt-home" ? <WeekPanel /> : null}
      {seccion === "mkt-campanas" ? (
        <CampaignsPanel
          campaignInicial={campaignInicial}
          onCampaignAbierta={() => setCampaignInicial(null)}
        />
      ) : null}
      {seccion === "mkt-tareas" ? <TasksPanel /> : null}
      {seccion === "mkt-calendario" ? (
        <CalendarPanel onAbrirCampaign={abrirCampaign} />
      ) : null}
      {seccion === "mkt-miembros" ? <MembersPanel /> : null}
    </>
  );
}
