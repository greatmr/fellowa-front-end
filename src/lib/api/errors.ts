import axios from "axios";

/**
 * Normalized API failure.
 *
 * `messages` are the human-readable strings the backend returned, already
 * flattened. They are NOT guaranteed to be localized — render a translated
 * message keyed on `status` / `code` where the copy matters, and fall back to
 * these only for unexpected failures.
 */
export class ApiError extends Error {
  readonly status: number | undefined;
  readonly code: string | undefined;
  readonly messages: string[];
  readonly isNetworkError: boolean;

  constructor(init: {
    message: string;
    status?: number;
    code?: string;
    messages?: string[];
    isNetworkError?: boolean;
    cause?: unknown;
  }) {
    super(init.message, { cause: init.cause });
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.messages = init.messages ?? [init.message];
    this.isNetworkError = init.isNetworkError ?? false;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isNotFound() {
    return this.status === 404;
  }
}

/**
 * The NestJS default exception body is `{ statusCode, message, error }`, where
 * `message` is a string or an array of strings (class-validator). Anything else
 * is read defensively — verify against the backend's exception filter before
 * relying on a field, and never invent one.
 */
function extractMessages(data: unknown): string[] {
  if (typeof data === "string" && data.trim()) return [data];
  if (data && typeof data === "object") {
    const body = data as Record<string, unknown>;
    const message = body.message ?? body.error;
    if (typeof message === "string" && message.trim()) return [message];
    if (Array.isArray(message)) {
      const strings = message.filter(
        (item): item is string => typeof item === "string",
      );
      if (strings.length) return strings;
    }
  }
  return [];
}

function extractCode(data: unknown): string | undefined {
  if (data && typeof data === "object") {
    const body = data as Record<string, unknown>;
    if (typeof body.code === "string") return body.code;
    if (typeof body.error === "string") return body.error;
  }
  return undefined;
}

/** Turn anything thrown by the API layer into an `ApiError`. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const messages = extractMessages(error.response?.data);

    return new ApiError({
      message: messages[0] ?? error.message,
      status,
      code: extractCode(error.response?.data),
      messages: messages.length ? messages : [error.message],
      isNetworkError: !error.response,
      cause: error,
    });
  }

  return new ApiError({
    message: error instanceof Error ? error.message : "Unexpected error",
    cause: error,
  });
}
