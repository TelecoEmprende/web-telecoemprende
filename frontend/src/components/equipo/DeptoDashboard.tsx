import { DeptoProvider, DirectorioProvider } from "./DeptoApi";
import type { Panel } from "./EquipoSidebar";
import { PlataformaPanel } from "./PlataformaPanel";
import { CalendarPanel } from "./marketing/CalendarPanel";
import { CampaignsPanel } from "./marketing/CampaignsPanel";
import { MembersPanel } from "./marketing/MembersPanel";
import { TasksPanel } from "./marketing/TasksPanel";
import {
  AlumniPanel,
  AnunciosPanel,
  DecisionesPanel,
  PresupuestoPanel,
  RecursosPanel,
  ReunionesPanel,
  ServiciosPanel,
} from "./registros/paneles";
import type { Team } from "../../types/equipo";

type Props = {
  /** Departamento primario: el que ata el contexto (`DeptoProvider`) para los
   *  paneles que todavía no son multi-departamento (Miembros, Recursos,
   *  Presupuesto, Reuniones, Alumni, Plataforma, Decisiones, Servicios,
   *  Calendario, Anuncios). */
  depto: Team;
  /** Departamentos filtrados a la vez -- solo lo usan Tareas y Proyectos, que
   *  sí saben mezclar varios (ver `TasksPanel`/`CampaignsPanel`). */
  deptos: Team[];
  seccion: Panel | "calendario" | "anuncios";
  /** Departamentos de la persona (no solo `deptos`): el calendario ahora es
   *  uno solo para todo el mundo y puede enseñar eventos de cualquiera de
   *  sus departamentos, no solo del que está filtrado. */
  teams: Team[];
  /** La campaña que "Proyectos" debe abrir directamente al montar (enlace
   *  compartido o salto desde el calendario de otro departamento) -- la
   *  resuelve `EquipoPage.tsx`, este componente solo la pasa al panel. */
  campaignInicial: number | null;
  onCampaignAbierta: () => void;
  /** Desde el calendario se salta a la campaña del elemento tocado, que
   *  puede ser de un departamento distinto al filtrado. */
  onAbrirCampaign: (campaignId: number, depto: Team) => void;
  /** Subconjunto de `teams` donde la persona es VP. */
  vpDe: Team[];
  /** Board del club: asigna tareas en cualquier departamento, sea VP o no. */
  puedeAsignarEnTodo: boolean;
};

/**
 * El panel activo, ya atado a su(s) departamento(s).
 *
 * Antes cada departamento montaba su propia copia de estos paneles bajo su
 * propio grupo del sidebar; ahora el sidebar tiene una sola entrada por panel
 * y quien lo llama (`EquipoPage`) ya decidió qué departamento(s) tocan --
 * este componente solo pinta el panel que corresponde.
 */
export function DeptoDashboard({
  depto, deptos, seccion, teams, campaignInicial, onCampaignAbierta, onAbrirCampaign, vpDe, puedeAsignarEnTodo,
}: Props) {
  return (
    <DeptoProvider value={depto}>
      <DirectorioProvider>
        {seccion === "campanas" ? (
          <CampaignsPanel
            deptos={deptos}
            campaignInicial={campaignInicial}
            onCampaignAbierta={onCampaignAbierta}
          />
        ) : null}
        {seccion === "tareas" ? (
          <TasksPanel
            deptos={deptos}
            teams={teams}
            vpDe={vpDe}
            puedeAsignarEnTodo={puedeAsignarEnTodo}
          />
        ) : null}
        {seccion === "calendario" ? (
          <CalendarPanel
            teams={teams}
            vpDe={vpDe}
            puedeAsignarEnTodo={puedeAsignarEnTodo}
            onAbrirCampaign={onAbrirCampaign}
          />
        ) : null}
        {seccion === "miembros" ? <MembersPanel /> : null}
        {seccion === "recursos" ? <RecursosPanel /> : null}
        {seccion === "presupuesto" ? <PresupuestoPanel /> : null}
        {seccion === "anuncios" ? <AnunciosPanel /> : null}
        {seccion === "reuniones" ? <ReunionesPanel /> : null}
        {seccion === "alumni" ? <AlumniPanel /> : null}
        {seccion === "plataforma" ? <PlataformaPanel /> : null}
        {seccion === "decisiones" ? <DecisionesPanel /> : null}
        {seccion === "servicios" ? <ServiciosPanel /> : null}
      </DirectorioProvider>
    </DeptoProvider>
  );
}
