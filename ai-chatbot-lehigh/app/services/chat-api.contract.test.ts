import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildFeedbackPayload,
  buildQuestionPayload,
  ChatTimeoutError,
  getSessionId,
  getSessionStorageKey,
  parseChatReply,
  persistSessionId,
  postToApi,
  requireBotName,
} from "./chat-api";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
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

  it("rejects the retired reply-only response shape", () => {
    expect(() =>
      parseChatReply(
        { reply: "A response from a different legacy contract" } as unknown as Parameters<
          typeof parseChatReply
        >[0],
        { sessionId: "fallback-session", questionId: "fallback-question" },
      ),
    ).toThrow("empty response");
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

  it("scopes browser sessions by endpoint and bot, then keeps a canonical backend session", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });

    const rossKey = getSessionStorageKey(
      "https://api.example.test/ross",
      "ross",
    );
    const otherCloneKey = getSessionStorageKey(
      "https://api.example.test/other",
      "other",
    );
    expect(rossKey).not.toBe(otherCloneKey);

    persistSessionId("backend-session-123");
    expect(getSessionId()).toBe("backend-session-123");
  });

  it("uses the backend canonical session for the next question", async () => {
    vi.stubEnv("VITE_CHAT_API_URL", "https://api.example.test/ross");
    vi.stubEnv("VITE_CHAT_BOT_NAME", "ross-test");
    vi.resetModules();

    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });

    const requests: Array<{ sessionId: string }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        requests.push(JSON.parse(String(init?.body)));
        return new Response(
          JSON.stringify({
            Response: "Answer",
            sessionId: "backend-canonical-session",
            questionId: "backend-question",
          }),
          { status: 200 },
        );
      }),
    );

    const api = await import("./chat-api");
    await api.sendMessage([
      { id: "user-1", role: "user", content: "First", timestamp: 1 },
    ]);
    await api.sendMessage([
      { id: "user-2", role: "user", content: "Second", timestamp: 2 },
    ]);
    await api.sendFeedback("backend-question", "up", "backend-canonical-session");

    expect(requests).toHaveLength(3);
    expect(requests[1].sessionId).toBe("backend-canonical-session");
    expect(requests[2].sessionId).toBe("backend-canonical-session");
  });

  it("does not restore a cleared session when an older request resolves", async () => {
    vi.stubEnv("VITE_CHAT_API_URL", "https://api.example.test/ross");
    vi.stubEnv("VITE_CHAT_BOT_NAME", "ross-test");
    vi.resetModules();

    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });

    let resolveResponse: (response: Response) => void = () => undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveResponse = resolve;
          }),
      ),
    );

    const api = await import("./chat-api");
    const pending = api.sendMessage([
      { id: "user-1", role: "user", content: "First", timestamp: 1 },
    ]);
    api.resetChatSession();
    resolveResponse(
      new Response(
        JSON.stringify({
          Response: "Late answer",
          sessionId: "stale-backend-session",
          questionId: "backend-question",
        }),
        { status: 200 },
      ),
    );
    await pending;

    expect(values.has(api.getSessionStorageKey())).toBe(false);
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
