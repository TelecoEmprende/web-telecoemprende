export type Team = "marketing" | "eventos" | "ingenieria";

export type EquipoLoginResponse =
  | { ok: true; teams: Team[] }
  | { ok: false; message: string };

export type EquipoSessionResponse = {
  ok: true;
  authenticated: boolean;
  teams: Team[];
};

export type EquipoAcceso = {
  id: number;
  email: string;
  equipos: Team[];
  activo: boolean;
  created_at: string;
};
