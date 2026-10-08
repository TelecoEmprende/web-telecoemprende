import type { Team } from "./equipo";

/** Dónde vive una nota: "" es el club entero. */
export type Ambito = Team | "";

export type NotaResumen = {
  id: number;
  titulo: string;
  departamento: Ambito;
  privada: boolean;
  fijada: boolean;
  creado_por: string;
  editado_por: string;
  created_at: string;
  updated_at: string;
  /** Texto plano del principio, para la lista y el Inicio. */
  resumen: string;
  /** Texto de las casillas sin marcar (las primeras). */
  pendientes: string[];
  checks_pendientes: number;
  checks_hechos: number;
};

/** Con el documento de BlockNote entero (lista de bloques). */
export type Nota = Omit<NotaResumen, "resumen" | "pendientes" | "checks_pendientes" | "checks_hechos"> & {
  contenido: unknown[];
};
