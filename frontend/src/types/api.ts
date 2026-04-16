export type ApiSuccess = {
  ok: true;
  message?: string;
};

export type ApiFailure = {
  ok: false;
  message: string;
  errors?: Record<string, string>;
};

export type ApiResult = ApiSuccess | ApiFailure;
