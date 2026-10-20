import { SelectorMiembros } from "../marketing/SelectorMiembros";

/** Quién lleva un proyecto: una sola persona del club, o nadie todavía. Se
 *  busca escribiendo el nombre, como al asignar tareas. */
export function ResponsableSelect({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (email: string) => void;
}) {
  return (
    <SelectorMiembros
      id={id}
      unico
      seleccionados={value ? [value] : []}
      onCambiar={(emails) => onChange(emails[0] ?? "")}
    />
  );
}
