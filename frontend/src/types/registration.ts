export type RegistrationPayload = {
  nombre: string;
  apellidos: string;
  estudios: string;
  email: string;
  privacidad: boolean;
  evento: string;
  telefono_oculto?: string;
};

export type RegistrationErrors = Partial<Record<keyof RegistrationPayload, string>>;
