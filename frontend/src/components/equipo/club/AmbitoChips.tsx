import { DEPTO_LABEL, TEAMS, type Team } from "../../../types/equipo";

/** Cómo se llama el ámbito de un proyecto: de los tres es «Todo el club». */
export function etiquetaAmbito(departamentos: Team[]): string[] {
  if (TEAMS.every((t) => departamentos.includes(t))) return ["Todo el club"];
  return TEAMS.filter((t) => departamentos.includes(t)).map((t) => DEPTO_LABEL[t]);
}

/**
 * Elegir de qué es un proyecto: de todo el club o de uno o varios
 * departamentos. Siempre queda al menos uno marcado.
 */
export function AmbitoChips({
  value,
  onChange,
  idPrefix = "ambito",
}: {
  value: Team[];
  onChange: (departamentos: Team[]) => void;
  idPrefix?: string;
}) {
  const todo = TEAMS.every((t) => value.includes(t));

  function alternar(team: Team) {
    const siguiente = value.includes(team) ? value.filter((t) => t !== team) : [...value, team];
    // Sin ninguno no hay proyecto: el último no se puede quitar.
    if (siguiente.length > 0) onChange(TEAMS.filter((t) => siguiente.includes(t)));
  }

  return (
    <div className="crm-tags-react" role="group" aria-label="Ámbito del proyecto" id={idPrefix}>
      <button
        type="button"
        className={`crm-tag${todo ? " crm-tag-activo-react" : ""}`}
        aria-pressed={todo}
        onClick={() => onChange([...TEAMS])}
      >
        Todo el club
      </button>
      {TEAMS.map((team) => (
        <button
          key={team}
          type="button"
          className={`crm-tag${!todo && value.includes(team) ? " crm-tag-activo-react" : ""}`}
          aria-pressed={!todo && value.includes(team)}
          onClick={() => (todo ? onChange([team]) : alternar(team))}
        >
          {DEPTO_LABEL[team]}
        </button>
      ))}
    </div>
  );
}
