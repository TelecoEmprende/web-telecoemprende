export type RegistrationPayload = {
  nombre: string;
  apellidos: string;
  escuela: string;
  nivel: string;
  estudios: string;
  email: string;
  departamento: string;
  drive_link: string;
  privacidad: boolean;
  evento: string;
  telefono_oculto?: string;
};

export type RegistrationErrors = Partial<Record<keyof RegistrationPayload, string>>;
