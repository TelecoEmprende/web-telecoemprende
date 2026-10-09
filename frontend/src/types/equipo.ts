export type Team = "marketing" | "eventos" | "ingenieria";

/** Los tres departamentos del club, en el orden en que se enseñan. Board
 *  puede asignar en cualquiera, esté o no dado de alta ahí. */
export const TEAMS: Team[] = ["marketing", "eventos", "ingenieria"];

/** El repositorio de la web (público). De aquí cuelgan los enlaces de
 *  Ingeniería en el sidebar y el commit desplegado en "Plataforma". */
export const GITHUB_REPO = "https://github.com/TelecoEmprende/web-telecoemprende";

/** El Slack del club. Es el mismo para todo el mundo (invitación abierta):
 *  sale en Herramientas y en "A quién escribir" del Inicio. */
export const SLACK_CLUB =
  "https://join.slack.com/t/telecoemprende/shared_invite/zt-492kyuq78-CJ~sB7TN5xz_j11xj1nnAw";

/** La carpeta compartida de Drive del club: sustituye al antiguo panel de
 *  Recursos, que repartía los enlaces por departamento. */
export const DRIVE_CLUB =
  "https://drive.google.com/drive/folders/1CkECllP_ut1MTpQSXSHhy_Cmn1ym15QX?usp=sharing";

export const DEPTO_LABEL: Record<Team, string> = {
  marketing: "Marketing",
  eventos: "Eventos",
  ingenieria: "Ingeniería",
};

/** Título en el club, independiente del departamento y del permiso de admin
 *  (`admin` en la sesión, `es_admin` en la cuenta). */
export type Cargo = "presidente" | "vicepresidente" | "boardmember" | "";

export const CARGO_LABEL: Record<Exclude<Cargo, "">, string> = {
  presidente: "Presidente",
  vicepresidente: "Vicepresidente",
  boardmember: "Board member",
};

export type EquipoLoginResponse =
  | {
      ok: true;
      message?: string;
      teams: Team[];
      vp_de: Team[];
      cargo: Cargo;
      nombre: string;
      /** Permiso de admin: grupo Admin del sidebar. */
      admin: boolean;
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
  admin: boolean;
};

/** Fila del directorio del club entero ("Quién es quién") -- solo lo básico,
 *  visible a cualquier miembro. Nada de notas ni datos personales (ver
 *  `EquipoAcceso`, la versión completa que solo ve admin). */
export type MiembroDirectorio = {
  email: string;
  equipos: Team[];
  vp_de: Team[];
  cargo: Cargo;
  nombre: string;
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
  apellidos: string;
  dni: string;
  correo_personal: string;
  /** Inscripción de la que salió la cuenta (`registrations.id`), o null. */
  registro_id: number | null;
  /** Foto como data URL, o "" para la de `public/` (ver `Avatares.tsx`). */
  foto: string;
  /** Permiso de admin, aparte del departamento y del cargo. */
  es_admin: boolean;
  /** Sale en la sección «Equipo» de la web pública (ver `MiembroWeb`). */
  en_web: boolean;
};

/** Una persona en la sección «Equipo» de la web pública
 *  (`GET /api/equipo/miembros-web`): la misma cuenta que en /equipo. */
export type MiembroWeb = {
  nombre: string;
  /** Primer apellido. */
  apellido: string;
  /** Data URL: solo salen quienes tienen foto subida en su cuenta. */
  foto: string;
  /** Presidente, board o VP de su departamento; null para el resto. */
  puesto: { es: string; en: string } | null;
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

/** Un evento del calendario público de Luma (ver `services/luma.py`). */
export type EventoLuma = {
  id: string;
  titulo: string;
  /** ISO con zona (UTC). */
  inicio: string;
  lugar: string;
  /** Página del evento en Luma, donde la gente se apunta. Puede venir vacía. */
  url: string;
};

/** Un servicio que Ingeniería ha marcado como acceso para todo el club. */
export type AccesoClub = {
  id: number;
  nombre: string;
  tipo: string;
  url: string;
  notas: string;
};
