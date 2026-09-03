export type Registro = {
  id: number;
  nombre: string;
  apellidos: string;
  escuela: string;
  nivel: string;
  estudios: string;
  email: string;
  telefono: string;
  departamento: string;
  drive_link: string;
  privacidad: string;
  fecha: string;
  evento: string;
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
