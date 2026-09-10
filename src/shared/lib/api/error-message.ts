import { ApiError, NetworkError, SessionEndedError } from "./errors";

/**
 * The API's own `message` describes the server and is written in English; it never
 * reaches a screen. Every code it can emit is listed here — see
 * `shared/errors/app-error.ts` in radarge-api.
 */
const MESSAGE_BY_CODE: Record<string, string> = {
  not_found: "Registro não encontrado. Ele pode ter sido removido.",
  conflict: "Já existe um registro com esses dados.",
  validation_failed: "Confira os campos e tente de novo.",
  unauthorized: "Sua sessão expirou. Entre novamente.",
  forbidden: "Você não tem permissão para fazer isso.",
  too_many_attempts: "Muitas tentativas seguidas. Espere alguns minutos.",
  password_change_required: "Defina uma nova senha para continuar.",
  internal_error: "Erro no servidor. Tente de novo em instantes.",
};

const OFFLINE = "Sem conexão com o servidor. Verifique sua internet.";
const SESSION_OVER = "Sua sessão expirou. Entre novamente.";

/**
 * `overrides` exists because a code does not always mean the same thing to the
 * person reading it: a 401 anywhere in the panel means the session ran out, but a
 * 401 on the sign-in screen means the password was wrong.
 */
export const messageForError = (
  error: unknown,
  fallback: string,
  overrides: Record<string, string> = {},
): string => {
  if (error instanceof ApiError) return overrides[error.code] ?? MESSAGE_BY_CODE[error.code] ?? fallback;
  if (error instanceof NetworkError) return OFFLINE;
  if (error instanceof SessionEndedError) return SESSION_OVER;
  return fallback;
};
