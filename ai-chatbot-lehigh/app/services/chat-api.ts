import type { Source } from "~/types/chat";

const API_URL = import.meta.env.VITE_CHAT_API_URL as string | undefined;
const BOT_NAME = "le-chat";

/**
 * Give up on a question after this long. The backend is buffered (no streaming),
 * so nothing arrives until the model finishes — a long answer has been observed
 * to take 11-14s, hence the generous ceiling.
 */
export const REQUEST_TIMEOUT_MS = 60_000;

/** Thrown when the request exceeded REQUEST_TIMEOUT_MS. */
export class ChatTimeoutError extends Error {
  constructor() {
    super(
      "Ross took too long to respond (over 60 seconds). Please try asking again.",
    );
    this.name = "ChatTimeoutError";
  }
}

export interface ChatResponse {
  reply: string;
  sources: Source[];
}

let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) sessionId = "session-" + Math.random().toString(36).substring(2, 9);
  return sessionId;
}

function generateQuestionId(): string {
  return "question-" + Math.random().toString(36).substring(2, 9);
}

export function resetSession(): void {
  sessionId = null;
}

export async function sendMessage(userMessage: string): Promise<ChatResponse> {
  if (!API_URL) {
    const stub = `Here is a list of Lehigh University College of Engineering Programs:

**Undergraduate Programs**
- Mechanical Engineering
- Electrical Engineering
- Computer Engineering
- Chemical Engineering
- Civil Engineering
- Industrial & Systems Engineering
- Materials Science & Engineering
- Bioengineering

**Interdisciplinary / Specialized**
- Integrated Engineering
- Environmental Engineering

**Graduate**
- Data Science
- Energy Systems Engineering
- Financial Engineering
- Technical Entrepreneurship

Is there a specific engineering program you are interested in at Lehigh?`;
    return new Promise((resolve) =>
      setTimeout(() => resolve({ reply: stub, sources: [] }), 600),
    );
  }

  const payload = {
    action: "question",
    bot_name: BOT_NAME,
    httpMethod: "POST",
    userMessage,
    sessionId: getSessionId(),
    questionId: generateQuestionId(),
  };

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    // An abort surfaces as a generic AbortError, so our own flag is what
    // distinguishes "we timed out" from any other network failure.
    if (timedOut) throw new ChatTimeoutError();
    throw err;
  } finally {
    clearTimeout(timer);
  }

  // The gateway gives up before we do, so surface its timeout the same way.
  if (res.status === 504 || res.status === 502) {
    throw new ChatTimeoutError();
  }

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (data.error) throw new Error(data.error);

  return { reply: data.Response, sources: data.Sources ?? [] };
}
