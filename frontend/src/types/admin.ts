export type Registro = {
  id: number;
  nombre: string;
  apellidos: string;
  estudios: string;
  email: string;
  privacidad: string;
  fecha: string;
};

export type AdminSessionResponse = {
  ok: true;
  authenticated: boolean;
};

export type AdminRegistrationsResponse =
  | {
      ok: true;
      total: number;
      registros: Registro[];
      eventos: string[];
    }
  | {
      ok: false;
      message: string;
    };
