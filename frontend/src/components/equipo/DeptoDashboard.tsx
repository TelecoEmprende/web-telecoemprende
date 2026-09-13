import { DeptoProvider, DirectorioProvider } from "./DeptoApi";
import type { Panel } from "./EquipoSidebar";
import { CalendarPanel } from "./marketing/CalendarPanel";
import { CampaignsPanel } from "./marketing/CampaignsPanel";
import { MembersPanel } from "./marketing/MembersPanel";
import { TasksPanel } from "./marketing/TasksPanel";
import {
  AlumniPanel,
  AnunciosPanel,
  PresupuestoPanel,
  RecursosPanel,
  ReunionesPanel,
} from "./registros/paneles";
import type { Team } from "../../types/equipo";

type Props = {
  depto: Team;
  seccion: Panel | "calendario" | "anuncios";
  /** Departamentos de la persona (no solo `depto`): el calendario ahora es
   *  uno solo para todo el mundo y puede enseñar eventos de cualquiera de
   *  sus departamentos, no solo del que está activo. */
  teams: Team[];
  /** La campaña que "Proyectos" debe abrir directamente al montar (enlace
   *  compartido o salto desde el calendario de otro departamento) -- la
   *  resuelve `EquipoPage.tsx`, este componente solo la pasa al panel. */
  campaignInicial: number | null;
  onCampaignAbierta: () => void;
  /** Desde el calendario se salta a la campaña del elemento tocado, que
   *  puede ser de un departamento distinto al activo. */
  onAbrirCampaign: (campaignId: number, depto: Team) => void;
  /** Board del club o VP de `depto`: solo ellos crean o reasignan tareas
   *  (ver docs/CLAUDE.md). */
  puedeAsignarTareas: boolean;
};

/**
 * El panel activo, ya atado al departamento elegido.
 *
 * Antes cada departamento montaba su propia copia de estos paneles bajo su
 * propio grupo del sidebar; ahora el sidebar tiene una sola entrada por panel
 * y quien lo llama (`EquipoPage`) ya decidió de qué departamento se trata --
 * este componente solo pinta el panel que toca con ese departamento atado.
 */
export function DeptoDashboard({
  depto, seccion, teams, campaignInicial, onCampaignAbierta, onAbrirCampaign, puedeAsignarTareas,
}: Props) {
  return (
    <DeptoProvider value={depto}>
      <DirectorioProvider>
        {seccion === "campanas" ? (
          <CampaignsPanel campaignInicial={campaignInicial} onCampaignAbierta={onCampaignAbierta} />
        ) : null}
        {seccion === "tareas" ? <TasksPanel puedeAsignar={puedeAsignarTareas} /> : null}
        {seccion === "calendario" ? (
          <CalendarPanel teams={teams} onAbrirCampaign={onAbrirCampaign} />
        ) : null}
        {seccion === "miembros" ? <MembersPanel /> : null}
        {seccion === "recursos" ? <RecursosPanel /> : null}
        {seccion === "presupuesto" ? <PresupuestoPanel /> : null}
        {seccion === "anuncios" ? <AnunciosPanel /> : null}
        {seccion === "reuniones" ? <ReunionesPanel /> : null}
        {seccion === "alumni" ? <AlumniPanel /> : null}
      </DirectorioProvider>
    </DeptoProvider>
  );
}
