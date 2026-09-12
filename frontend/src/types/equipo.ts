export type Team = "marketing" | "eventos" | "ingenieria";

export type Cargo = "presidente" | "boardmember" | "";

export type EquipoLoginResponse =
  | { ok: true; message?: string; teams: Team[]; vp_de: Team[]; cargo: Cargo; nombre: string }
  | { ok: false; message: string };

export type EquipoSessionResponse = {
  ok: true;
  authenticated: boolean;
  teams: Team[];
  vp_de: Team[];
  cargo: Cargo;
  email: string;
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
};

export type EventoCalendario = {
  id: number;
  titulo: string;
  descripcion: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM o ""
};
