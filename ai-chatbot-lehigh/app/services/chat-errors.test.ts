import { describe, expect, it } from "vitest";
import {
  ChatServiceError,
  getChatErrorInfo,
  httpError,
  kindFromErrorBody,
} from "./chat-errors";

describe("controlled chat errors", () => {
  it("does not expose unknown exception messages or arbitrary error details", () => {
    const unknown = getChatErrorInfo(new Error("private exception"));
    const supplied = new ChatServiceError({
      kind: "service",
      title: "private title",
      message: "private message",
      retryable: false,
      details: "private details",
    });
    supplied.message = "private changed exception";
    const safe = getChatErrorInfo(supplied);
    expect(safe).toMatchObject({ kind: "service", retryable: true });
    expect(safe.details).toBeUndefined();
    expect(JSON.stringify([unknown, safe])).not.toMatch(/private/);
  });

  it("generates controlled feedback wording, including uncertain timeout results", () => {
    const error = new ChatServiceError({
      kind: "timeout",
      title: "secret title",
      message: "secret message",
      retryable: false,
      details: "secret details",
    });
    expect(getChatErrorInfo(error, "feedback")).toEqual({
      kind: "timeout",
      title: "We couldn’t confirm your feedback",
      message: "Please try rating the answer again.",
      retryable: true,
    });
  });

  it.each([401, 403, 500])("does not infer policy refusal from HTTP %i", (status) => {
    const result = getChatErrorInfo(httpError(status, "question", { error: "policy violation" }));
    expect(result.kind).toBe(status === 500 ? "service" : "access");
    expect(JSON.stringify(result)).not.toMatch(/policy|violation/i);
  });

  it.each([
    [{ error: "<html>private</html>" }],
    [{ error: "Error: private\n at internal.ts:4" }],
    [{ error: { message: "service unavailable" } }],
    [{ error: "service unavailable due to policy" }],
  ])("does not map unknown or unsafe body %#", (body) => {
    expect(kindFromErrorBody(body)).toBeUndefined();
    expect(JSON.stringify(getChatErrorInfo(httpError(400, "question", body)))).not.toMatch(/private|internal|policy/);
  });

  it.each([
    [" TOO MANY REQUESTS ", "rate_limit"],
    ["rate limit exceeded", "rate_limit"],
    ["request timed out", "timeout"],
    ["request timeout", "timeout"],
    ["service unavailable", "service"],
  ] as const)("maps an exact known error to controlled wording", (value, kind) => {
    expect(kindFromErrorBody({ error: value })).toBe(kind);
  });
});
