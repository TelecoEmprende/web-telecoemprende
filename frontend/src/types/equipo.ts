export type Team = "marketing" | "eventos" | "ingenieria";

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
