import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { DeptoProvider, DirectorioProvider } from "./DeptoApi";
import { prefijoDe, type Seccion } from "./EquipoSidebar";
import { CalendarPanel } from "./marketing/CalendarPanel";
import { CampaignsPanel } from "./marketing/CampaignsPanel";
import { MembersPanel } from "./marketing/MembersPanel";
import { TasksPanel } from "./marketing/TasksPanel";
import { WeekPanel } from "./marketing/WeekPanel";
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
  /** Departamentos de la persona (no solo `depto`): el calendario ahora es
   *  uno solo para todo el mundo y puede enseñar eventos de cualquiera de
   *  sus departamentos, no solo del que está activo. */
  teams: Team[];
  seccion: Seccion;
  onSeccion: (seccion: Seccion) => void;
  /** Board del club o VP de `depto`: solo ellos ven "Salud del equipo" en el
   *  resumen (ver `WeekPanel`) -- la puntuación de participación no se le
   *  enseña al miembro raso, para no meter competición entre compañeros. */
  puedeVerSalud: boolean;
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
export function DeptoDashboard({ depto, teams, seccion, onSeccion, puedeVerSalud }: Props) {
  const [campaignInicial, setCampaignInicial] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const p = prefijoDe(depto);

  /** Desde el calendario se salta a la campaña del elemento tocado, para que
   *  no sea un callejón sin salida. La sección la manda el shell.
   *
   *  El calendario es uno solo y puede enseñar un evento de un departamento
   *  DISTINTO al activo (`depto`) -- ej. Abril, en Marketing e Ingeniería,
   *  viendo el calendario desde el contexto de Marketing pero tocando un
   *  evento de Ingeniería. En ese caso no basta con cambiar de sección: hay
   *  que remontar este componente en el contexto de ese otro departamento
   *  (`key={deptoActual}` en `EquipoPage`), y el remount pierde el estado
   *  local de aquí (`campaignInicial`). Se reusa el mismo mecanismo que un
   *  enlace compartido (`?campaign=`, ver el efecto de abajo): la nueva
   *  instancia lo lee sola al montar. */
  function abrirCampaign(campaignId: number, departamento: Team) {
    if (departamento === depto) {
      setCampaignInicial(campaignId);
      onSeccion(`${p}-campanas` as Seccion);
      return;
    }
    // `setSearchParams` (estado del router) y `onSeccion` (estado de
    // `EquipoPage`) son dos fuentes de estado distintas. Si `onSeccion` se
    // llama en el mismo tick, cambia `deptoActual` y remonta este componente
    // ANTES de que la navegación del router termine de aplicarse -- la
    // instancia nueva monta con la URL todavía sin el `?campaign=` (se
    // comprobó viendo los montajes: la segunda instancia leía `search: ""`).
    // El `queueMicrotask` deja que la URL se asiente primero.
    setSearchParams(
      (actuales) => {
        const siguientes = new URLSearchParams(actuales);
        siguientes.set("campaign", String(campaignId));
        return siguientes;
      },
      { replace: true },
    );
    queueMicrotask(() => onSeccion(`${prefijoDe(departamento)}-campanas` as Seccion));
  }

  // Enlace compartible (ver "Copiar enlace" en CampaignsPanel): al entrar en
  // este departamento con ?campaign=<id> en la URL, se abre directo. No
  // resuelve el departamento por sí solo -- si el enlace es de una campaña
  // de otro departamento, aquí no aparece -- pero evita tener que explicar
  // "entra a Marketing y búscala" para quien ya está en el suyo.
  useEffect(() => {
    const campaignId = Number(searchParams.get("campaign"));
    if (!campaignId) return;

    // Este enlace no dice de qué departamento es la campaña (ver el
    // comentario de arriba): se asume el de este mismo dashboard, como
    // siempre -- por eso pasa `depto`, no uno ajeno.
    abrirCampaign(campaignId, depto);
    setSearchParams(
      (actuales) => {
        const siguientes = new URLSearchParams(actuales);
        siguientes.delete("campaign");
        return siguientes;
      },
      { replace: true },
    );
    // Solo al montar: es la URL con la que se llegó, no algo a repetir en
    // cada cambio de sección.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DeptoProvider value={depto}>
      <DirectorioProvider>
        {seccion === `${p}-home` ? <WeekPanel puedeVerSalud={puedeVerSalud} /> : null}
        {seccion === `${p}-campanas` ? (
          <CampaignsPanel
            campaignInicial={campaignInicial}
            onCampaignAbierta={() => setCampaignInicial(null)}
          />
        ) : null}
        {seccion === `${p}-tareas` ? <TasksPanel /> : null}
        {seccion === `${p}-calendario` ? (
          <CalendarPanel teams={teams} onAbrirCampaign={abrirCampaign} />
        ) : null}
        {seccion === `${p}-miembros` ? <MembersPanel /> : null}
        {seccion === `${p}-recursos` ? <RecursosPanel /> : null}
        {seccion === `${p}-presupuesto` ? <PresupuestoPanel /> : null}
        {seccion === `${p}-anuncios` ? <AnunciosPanel /> : null}
        {seccion === `${p}-reuniones` ? <ReunionesPanel /> : null}
        {seccion === `${p}-alumni` ? <AlumniPanel /> : null}
      </DirectorioProvider>
    </DeptoProvider>
  );
}
