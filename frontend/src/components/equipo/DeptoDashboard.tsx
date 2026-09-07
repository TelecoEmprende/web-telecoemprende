import { useState } from "react";

import { DeptoProvider } from "./DeptoApi";
import { prefijoDe, type Seccion } from "./EquipoSidebar";
import { CalendarPanel } from "./marketing/CalendarPanel";
import { CampaignsPanel } from "./marketing/CampaignsPanel";
import { MembersPanel } from "./marketing/MembersPanel";
import { TasksPanel } from "./marketing/TasksPanel";
import { WeekPanel } from "./marketing/WeekPanel";
import type { Team } from "../../types/equipo";

type Props = {
  depto: Team;
  seccion: Seccion;
  onSeccion: (seccion: Seccion) => void;
};

/**
 * Paneles del workspace de un departamento (Marketing o Eventos).
 *
 * Los dos departamentos usan exactamente los mismos paneles: en el backend es
 * el mismo blueprint registrado dos veces, y aquí lo único que cambia es el
 * `depto` del provider, que ata todas las llamadas de API al departamento
 * correcto. Los paneles siguen viviendo en `marketing/` por el nombre que
 * tenían cuando solo los usaba Marketing.
 *
 * No monta shell propio: el sidebar, la barra y el área de trabajo son de
 * `/equipo` (ver `EquipoPage.tsx`), y este componente solo decide qué panel
 * toca.
 */
export function DeptoDashboard({ depto, seccion, onSeccion }: Props) {
  const [campaignInicial, setCampaignInicial] = useState<number | null>(null);
  const p = prefijoDe(depto);

  /** Desde el calendario se salta a la campaña del elemento tocado, para que
   *  no sea un callejón sin salida. La sección la manda el shell. */
  function abrirCampaign(campaignId: number) {
    setCampaignInicial(campaignId);
    onSeccion(`${p}-campanas` as Seccion);
  }

  return (
    <DeptoProvider value={depto}>
      {seccion === `${p}-home` ? <WeekPanel /> : null}
      {seccion === `${p}-campanas` ? (
        <CampaignsPanel
          campaignInicial={campaignInicial}
          onCampaignAbierta={() => setCampaignInicial(null)}
        />
      ) : null}
      {seccion === `${p}-tareas` ? <TasksPanel /> : null}
      {seccion === `${p}-calendario` ? (
        <CalendarPanel onAbrirCampaign={abrirCampaign} />
      ) : null}
      {seccion === `${p}-miembros` ? <MembersPanel /> : null}
    </DeptoProvider>
  );
}
