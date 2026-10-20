type ApiSuccess = {
  ok: true;
  message?: string;
};

export type ApiFailure = {
  ok: false;
  message: string;
  errors?: Record<string, string>;
  /** Sin red o error del servidor (5xx): reintentar puede funcionar. Un 4xx no. */
  reintentable?: boolean;
};

export type ApiResult = ApiSuccess | ApiFailure;
