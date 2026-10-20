import { DeptoProvider, DirectorioProvider, YoProvider } from "./DeptoApi";
import type { AccionInicio, Panel } from "./EquipoSidebar";
import { CalendarPanel } from "./marketing/CalendarPanel";
import { CampaignsPanel } from "./marketing/CampaignsPanel";
import { MembersPanel } from "./marketing/MembersPanel";
import { TasksPanel } from "./marketing/TasksPanel";
import { PresupuestoPanel } from "./registros/paneles";
import { ReunionesPanel } from "./registros/ReunionesPanel";
import type { Team } from "../../types/equipo";

type Props = {
  /** Departamento primario: el que ata el contexto (`DeptoProvider`) para los
   *  paneles que todavía no son multi-departamento (Miembros,
   *  Presupuesto, Reuniones,
   *  Calendario). */
  depto: Team;
  /** Departamentos filtrados a la vez -- solo lo usan Tareas y Proyectos, que
   *  sí saben mezclar varios (ver `TasksPanel`/`CampaignsPanel`). */
  deptos: Team[];
  seccion: Panel | "calendario";
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
  /** Abre una nota en Notas (desde las notas enlazadas a un proyecto). */
  onAbrirNota: (id: number) => void;
  /** Email de quien ha entrado. */
  yo?: string;
  /** Lo que pidió un botón del Inicio («Nueva tarea», «Buscar miembro»). */
  accionInicio?: AccionInicio | null;
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
  onAbrirNota, yo = "", accionInicio = null,
}: Props) {
  return (
    <DeptoProvider value={depto}>
      <YoProvider value={yo}>
      <DirectorioProvider>
        {seccion === "campanas" ? (
          <CampaignsPanel
            deptos={deptos}
            campaignInicial={campaignInicial}
            onCampaignAbierta={onCampaignAbierta}
            onAbrirNota={onAbrirNota}
          />
        ) : null}
        {seccion === "tareas" ? (
          <TasksPanel
            deptos={deptos}
            teams={teams}
            vpDe={vpDe}
            puedeAsignarEnTodo={puedeAsignarEnTodo}
            abrirFormulario={accionInicio === "nueva-tarea"}
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
        {seccion === "miembros" ? <MembersPanel
            enfocarBuscador={accionInicio === "buscar-miembro"}
            puedeAsignar={puedeAsignarEnTodo || vpDe.length > 0}
          /> : null}
        {seccion === "presupuesto" ? <PresupuestoPanel /> : null}
        {seccion === "reuniones" ? (
          <ReunionesPanel deptos={deptos} esDirectiva={puedeAsignarEnTodo || vpDe.length > 0} />
        ) : null}
      </DirectorioProvider>
      </YoProvider>
    </DeptoProvider>
  );
}
