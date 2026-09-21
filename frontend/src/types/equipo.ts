export type Team = "marketing" | "eventos" | "ingenieria";

/** Los tres departamentos del club, en el orden en que se enseñan. Board
 *  puede asignar en cualquiera, esté o no dado de alta ahí. */
export const TEAMS: Team[] = ["marketing", "eventos", "ingenieria"];

/** El repositorio de la web (público). De aquí cuelgan los enlaces de
 *  Ingeniería en el sidebar y el commit desplegado en "Plataforma". */
export const GITHUB_REPO = "https://github.com/TelecoEmprende/web-telecoemprende";

export const DEPTO_LABEL: Record<Team, string> = {
  marketing: "Marketing",
  eventos: "Eventos",
  ingenieria: "Ingeniería",
};

export type Cargo = "presidente" | "boardmember" | "";

export type EquipoLoginResponse =
  | {
      ok: true;
      message?: string;
      teams: Team[];
      vp_de: Team[];
      cargo: Cargo;
      nombre: string;
      mentor_email: string;
    }
  | { ok: false; message: string };

export type EquipoSessionResponse = {
  ok: true;
  authenticated: boolean;
  teams: Team[];
  vp_de: Team[];
  cargo: Cargo;
  email: string;
  nombre: string;
  mentor_email: string;
};

/** Fila del directorio del club entero ("Quién es quién") -- solo lo básico,
 *  visible a cualquier miembro. Nada de notas/onboarding, que son privados
 *  (ver `EquipoAcceso`, la versión completa que solo ve /admin). El mentor sí
 *  viaja aquí (no es privado): es lo que deja a "Mi semana" enseñar "Mi
 *  mentora" y "Tutoriza a" cruzando este directorio con la sesión propia. */
export type MiembroDirectorio = {
  email: string;
  equipos: Team[];
  vp_de: Team[];
  cargo: Cargo;
  nombre: string;
  mentor_email: string;
};

export type EquipoAcceso = {
  id: number;
  email: string;
  equipos: Team[];
  vp_de: Team[];
  cargo: Cargo;
  activo: boolean;
  created_at: string;
  nombre: string;
  dni: string;
  correo_personal: string;
  mentor_email: string;
};

export type EventoCalendario = {
  id: number;
  titulo: string;
  descripcion: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM o ""
  /** Emails que dijeron "voy". */
  confirmados: string[];
  /** Emails con check-in real el día del evento -- alimenta la métrica de
   *  asistencia, a diferencia de `confirmados` (solo intención previa). */
  asistio: string[];
};
