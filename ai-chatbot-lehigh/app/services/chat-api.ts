import type { Source } from "~/types/chat";

const API_URL = import.meta.env.VITE_CHAT_API_URL as string | undefined;
const BOT_NAME = "le-chat";

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

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (data.error) throw new Error(data.error);

  return { reply: data.Response, sources: data.Sources ?? [] };
}
