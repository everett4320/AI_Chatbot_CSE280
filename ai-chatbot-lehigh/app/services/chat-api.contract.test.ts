import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildFeedbackPayload,
  buildQuestionPayload,
  ChatTimeoutError,
  parseChatReply,
  postToApi,
  requireBotName,
} from "./chat-api";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Lehigh chatbot API contract", () => {
  it("builds the existing question payload without backend changes", () => {
    expect(
      buildQuestionPayload(
        "What programs are there?",
        "session-abc1234",
        "question-def5678",
        "ross-test",
      ),
    ).toEqual({
      action: "question",
      bot_name: "ross-test",
      httpMethod: "POST",
      userMessage: "What programs are there?",
      sessionId: "session-abc1234",
      questionId: "question-def5678",
    });
  });

  it("parses Markdown, sources, and backend identifiers", () => {
    expect(
      parseChatReply(
        {
          Response: "## Programs\n\n- Bioengineering\n- Computer Science",
          Sources: [
            {
              title: "Academic Programs",
              url: "https://engineering.lehigh.edu/academics",
            },
          ],
          sessionId: "session-from-backend",
          questionId: "question-from-backend",
        },
        { sessionId: "fallback-session", questionId: "fallback-question" },
      ),
    ).toEqual({
      content: "## Programs\n\n- Bioengineering\n- Computer Science",
      sources: [
        {
          title: "Academic Programs",
          url: "https://engineering.lehigh.edu/academics",
        },
      ],
      sessionId: "session-from-backend",
      questionId: "question-from-backend",
    });
  });

  it.each([
    ["up", "Good"],
    ["down", "Bad"],
  ] as const)("maps %s feedback to the existing %s value", (rating, feedback) => {
    expect(
      buildFeedbackPayload(
        "session-abc1234",
        "question-def5678",
        rating,
        "ross-test",
      ),
    ).toEqual({
      action: "feedback",
      bot_name: "ross-test",
      sessionId: "session-abc1234",
      questionId: "question-def5678",
      feedback,
    });
  });

  it("requires a non-blank backend bot identifier for real API requests", () => {
    expect(requireBotName(" ross ")).toBe("ross");
    expect(() => requireBotName(undefined)).toThrow("chatbot identity");
    expect(() => requireBotName("   ")).toThrow("chatbot identity");
  });

  it("maps only gateway timeout responses to the timeout error", async () => {
    const payload = buildQuestionPayload(
      "What programs are there?",
      "session-abc1234",
      "question-def5678",
      "ross-test",
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, { status: 504, statusText: "Gateway Timeout" }),
      ),
    );
    await expect(
      postToApi("https://example.test/call", payload, "API", {
        parseJson: true,
      }),
    ).rejects.toBeInstanceOf(ChatTimeoutError);

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(null, { status: 502, statusText: "Bad Gateway" }),
        ),
    );
    await expect(
      postToApi("https://example.test/call", payload, "API", {
        parseJson: true,
      }),
    ).rejects.toThrow("API error: 502 Bad Gateway");
  });

  it("keeps the timeout active while the response body is read", async () => {
    vi.useFakeTimers();
    const payload = buildQuestionPayload(
      "What programs are there?",
      "session-abc1234",
      "question-def5678",
      "ross-test",
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const signal = init?.signal;
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: () =>
            new Promise((_resolve, reject) => {
              signal?.addEventListener(
                "abort",
                () => reject(new DOMException("Aborted", "AbortError")),
                { once: true },
              );
            }),
        } as Response;
      }),
    );

    const request = postToApi(
      "https://example.test/call",
      payload,
      "API",
      { parseJson: true, timeoutMs: 25 },
    );
    const rejection = expect(request).rejects.toBeInstanceOf(ChatTimeoutError);
    await vi.advanceTimersByTimeAsync(25);

    await rejection;
  });
});
