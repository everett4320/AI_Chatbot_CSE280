import type { ChatErrorInfo, ChatErrorKind } from "~/types/chat";

type Operation = "question" | "feedback";

export class ChatServiceError extends Error {
  constructor(public readonly info: ChatErrorInfo) {
    super(info.message);
    this.name = "ChatServiceError";
  }
}

export function errorInfo(
  kind: ChatErrorKind,
  operation: Operation = "question",
  details?: string,
): ChatErrorInfo {
  const entries: Record<ChatErrorKind, [string, string, boolean]> = {
    timeout: ["Ross took too long to respond", "Please try again.", true],
    service: ["Ross is temporarily unavailable.", "Please try again in a moment.", true],
    rate_limit: ["Too many requests", "Please wait a moment and try again.", true],
    access: ["Ross can’t process your request", "Please try again later.", false],
    invalid_response: ["Ross couldn’t finish the reply", "Please try again.", true],
    network: ["Couldn’t reach Ross", "Check your connection or try again.", true],
    configuration: ["Ross is unavailable", "Please try again later.", false],
    request: ["Ross couldn’t process your request", "Please try again.", true],
  };
  const [questionTitle, questionMessage, retryable] = entries[kind] ?? entries.request;
  const title = operation === "feedback"
    ? kind === "timeout" || kind === "invalid_response"
      ? "We couldn’t confirm your feedback"
      : "Your feedback wasn’t saved"
    : questionTitle;
  const message = operation === "feedback"
    ? "Please try rating the answer again."
    : questionMessage;
  return { kind, title, message, retryable, ...(details ? { details } : {}) };
}

/** Map exact, known messages to our own wording; never display the source text. */
export function kindFromErrorBody(body: unknown): ChatErrorKind | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  const value = (body as Record<string, unknown>).error;
  if (typeof value !== "string") return undefined;
  switch (value.trim().toLowerCase()) {
    case "too many requests":
    case "rate limit exceeded":
      return "rate_limit";
    case "request timed out":
    case "request timeout":
      return "timeout";
    case "service unavailable":
      return "service";
    default:
      return undefined;
  }
}

export function getChatErrorInfo(
  error: unknown,
  operation: Operation = "question",
): ChatErrorInfo {
  if (error instanceof ChatServiceError) {
    // Only retain a bounded, controlled status label, never arbitrary details.
    const details = /^HTTP [1-5]\d\d$/.test(error.info.details ?? "")
      ? error.info.details
      : undefined;
    return errorInfo(error.info.kind, operation, details);
  }
  return errorInfo("request", operation);
}

export function httpError(
  status: number,
  operation: Operation,
  body: unknown,
): ChatServiceError {
  const kind: ChatErrorKind = status === 408 || status === 504 ? "timeout"
    : status === 429 ? "rate_limit"
    : status === 401 || status === 403 ? "access"
    : status >= 500 ? "service"
    : kindFromErrorBody(body) ?? "request";
  return new ChatServiceError(errorInfo(kind, operation, `HTTP ${status}`));
}
