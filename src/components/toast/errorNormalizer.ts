/**
 * Centralized error normalization for Echo.
 *
 * Converts technical errors (axios errors, network failures, timeouts,
 * unknown backend responses) into safe, human-readable application messages.
 *
 * Backend-provided strings are intentionally NOT surfaced verbatim: they can
 * leak internal details (SQL, file paths, tokens, account existence). All
 * user-facing text lives in this module.
 */

const STATUS_MESSAGES: Record<number, string> = {
  400: "We couldn't process that request. Please check your details and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: "That action conflicts with something already in place.",
  422: "Please check the details you entered and try again.",
  429: "You're moving a little fast. Please wait a moment and try again.",
  500: "Something went wrong on our end. Please try again.",
  502: "Something went wrong on our end. Please try again shortly.",
  503: "Echo is temporarily unavailable. Please try again shortly.",
  504: "The request took too long. Please try again.",
};

interface ExtractedError {
  status?: number;
  isTimeout: boolean;
  isNetworkError: boolean;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extract(error: unknown): ExtractedError {
  if (error instanceof Error) {
    const typed = error as Error & {
      code?: string;
      status?: number;
      response?: { status?: number };
    };
    return {
      status: typed.status ?? typed.response?.status,
      isTimeout:
        typed.code === "ECONNABORTED" ||
        typed.name === "TimeoutError" ||
        /timed?\s*out|timeout/i.test(typed.message),
      isNetworkError:
        typed.code === "ERR_NETWORK" ||
        /network error|failed to fetch/i.test(typed.message),
    };
  }

  if (isObject(error)) {
    const typed = error as {
      code?: string;
      status?: number;
      response?: { status?: number };
    };
    return {
      status: typed.status ?? typed.response?.status,
      isTimeout: typed.code === "ECONNABORTED",
      isNetworkError: typed.code === "ERR_NETWORK",
    };
  }

  return { isTimeout: false, isNetworkError: false };
}

/**
 * Convert an arbitrary error into a safe, user-friendly message.
 */
export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  const { status, isTimeout, isNetworkError } = extract(error);

  if (isTimeout) return "The request took too long. Please try again.";
  if (isNetworkError)
    return "You're offline. Please check your connection and try again.";
  if (status && STATUS_MESSAGES[status]) return STATUS_MESSAGES[status];

  return fallback;
}

/**
 * Authentication-specific variant. Never reveals whether an account exists.
 */
export function getAuthErrorMessage(error: unknown): string {
  const { status, isTimeout, isNetworkError } = extract(error);

  if (isTimeout)
    return "Unable to sign in. The request timed out. Please try again.";
  if (isNetworkError)
    return "Unable to sign in. We couldn't reach Echo right now. Please try again shortly.";
  if (status === 401 || status === 403)
    return "Unable to sign in. Please check your credentials and try again.";

  return "Unable to sign in. Please try again.";
}

/**
 * Server/network availability variant for non-credential failures.
 */
export function getServerUnavailableMessage(): string {
  return "We couldn't reach Echo right now. Please try again shortly.";
}