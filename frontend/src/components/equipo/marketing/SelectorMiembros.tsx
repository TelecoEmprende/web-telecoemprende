import { ChevronDown, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useApi, useDepto } from "../DeptoApi";
import { apiDepto } from "../../../api/marketing";
import { AvatarResponsable, etiquetaDe } from "./Avatares";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Team } from "../../../types/equipo";
import type { Miembro } from "../../../types/marketing";

type Props = {
  id?: string;
  seleccionados: string[];
  onCambiar: (emails: string[]) => void;
  /** De qué departamentos sale el roster. Por defecto, el del contexto
   *  (`useApi`); se pasa explícitamente cuando lo que se está editando no es
   *  del departamento que se está viendo -- crear una tarea para Eventos
   *  desde el tablero de Marketing ofrecía la gente de Marketing. */
  deptos?: Team[];
  /** Al asignar tareas: propone a la persona con menos tareas abiertas,
   *  empezando por quien tiene el departamento como 1ª preferencia. */
  proponer?: boolean;
};

const ORDINAL = ["1ª", "2ª", "3ª"];

/** Qué preferencia es este departamento para la persona (0 = 1ª): el orden de
 *  `equipos` es el que fija admin en Cuentas del equipo. Con varios
 *  departamentos, cuenta el mejor. */
function preferencia(m: Miembro, deptos: Team[]): number {
  const posiciones = deptos.map((d) => m.equipos.indexOf(d)).filter((i) => i >= 0);
  return posiciones.length ? Math.min(...posiciones) : ORDINAL.length;
}

/** Primero la 1ª preferencia, luego la 2ª...; dentro de cada una, quien
 *  menos tareas abiertas lleva. */
export function ordenarParaAsignar(miembros: Miembro[], deptos: Team[]): Miembro[] {
  return [...miembros].sort(
    (a, b) =>
      preferencia(a, deptos) - preferencia(b, deptos) ||
      a.abiertas - b.abiertas ||
      (a.nombre || a.email).localeCompare(b.nombre || b.email),
  );
}

/**
 * Elegir personas del equipo por nombre y foto en vez de teclear su email de
 * memoria -- lo que se pedía hasta ahora en responsables de tarea/contenido y
 * asistentes de reunión. El roster sale de `getMiembros()`, el mismo que
 * pinta el panel de Miembros; si no carga, el campo se queda vacío en vez de
 * roto (no hay nada que elegir, pero el formulario sigue enviándose).
 */
export function SelectorMiembros({
  id,
  seleccionados,
  onCambiar,
  deptos,
  proponer = false,
}: Props) {
  const { getMiembros } = useApi();
  const deptoActual = useDepto();
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const deptosRoster = deptos?.length ? deptos : [deptoActual];

  useEffect(() => {
    let activo = true;
    // Con varios departamentos el roster es la unión de los suyos, sin
    // repetir a quien esté en más de uno.
    const peticiones = deptos?.length
      ? deptos.map((d) => apiDepto(d).getMiembros())
      : [getMiembros()];
    void Promise.all(peticiones)
      .then((respuestas) => {
        if (!activo) return;
        // Las tareas abiertas son por departamento: con varios, se suman.
        const porEmail = new Map<string, Miembro>();
        for (const r of respuestas)
          for (const m of r.miembros) {
            const previo = porEmail.get(m.email);
            porEmail.set(m.email, previo ? { ...m, abiertas: previo.abiertas + m.abiertas } : m);
          }
        setMiembros([...porEmail.values()]);
      })
      .catch(() => {
        // Sin roster no hay picker que ofrecer; no bloquea el formulario.
      });
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getMiembros, deptos?.join(",")]);

  function alternar(email: string) {
    onCambiar(
      seleccionados.includes(email)
        ? seleccionados.filter((e) => e !== email)
        : [...seleccionados, email],
    );
  }

  function nombreDe(email: string) {
    return miembros.find((m) => m.email === email)?.nombre;
  }

  const ordenados = useMemo(
    () => ordenarParaAsignar(miembros, deptosRoster),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [miembros, deptosRoster.join(",")],
  );
  // La propuesta es el primero del orden: mejor preferencia y menos carga.
  const propuesta = proponer && seleccionados.length === 0 ? ordenados[0] : undefined;

  return (
    <div className="mkt-selector-react">
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" id={id} className="mkt-selector-miembros-react">
            {seleccionados.length === 0 ? (
              <span className="mkt-selector-placeholder-react">Elegir personas...</span>
            ) : (
              <span className="mkt-selector-elegidos-react">
                {seleccionados.map((email) => (
                  <AvatarResponsable key={email} email={email} nombre={nombreDe(email)} />
                ))}
                <span className="mkt-selector-nombres-react">
                  {seleccionados.map((email) => etiquetaDe(email, nombreDe(email))).join(", ")}
                </span>
              </span>
            )}
            <ChevronDown aria-hidden="true" size={16} className="mkt-selector-flecha-react" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="mkt-selector-contenido-react">
          {miembros.length === 0 ? (
            <p className="mkt-selector-vacio-react">Nadie en el equipo todavía.</p>
          ) : (
            <ul className="mkt-selector-lista-react">
              {ordenados.map((m) => {
                const pref = preferencia(m, deptosRoster);
                return (
                  <li key={m.email}>
                    <label className="mkt-selector-fila-react">
                      <Checkbox
                        checked={seleccionados.includes(m.email)}
                        onCheckedChange={() => alternar(m.email)}
                      />
                      <AvatarResponsable email={m.email} nombre={m.nombre} />
                      <span className="mkt-selector-nombre-react">{etiquetaDe(m.email, m.nombre)}</span>
                      {pref < ORDINAL.length ? (
                        <span
                          className={`mkt-selector-pref-react${pref === 0 ? " is-primera" : ""}`}
                          title={`${ORDINAL[pref]} preferencia`}
                        >
                          {ORDINAL[pref]}
                        </span>
                      ) : null}
                      <span className="mkt-selector-carga-react">
                        {m.abiertas} {m.abiertas === 1 ? "abierta" : "abiertas"}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </PopoverContent>
      </Popover>
      {propuesta ? (
        <button
          type="button"
          className="mkt-selector-propuesta-react"
          onClick={() => onCambiar([propuesta.email])}
        >
          <Sparkles aria-hidden="true" size={14} />
          <span>
            Propuesta: <strong>{etiquetaDe(propuesta.email, propuesta.nombre)}</strong>
            {" · "}
            {preferencia(propuesta, deptosRoster) < ORDINAL.length
              ? `${ORDINAL[preferencia(propuesta, deptosRoster)]} preferencia · `
              : ""}
            {propuesta.abiertas} {propuesta.abiertas === 1 ? "tarea abierta" : "tareas abiertas"}
          </span>
          <span className="mkt-selector-propuesta-accion-react">Asignar</span>
        </button>
      ) : null}
    </div>
  );
}
