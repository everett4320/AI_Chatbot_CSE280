import type { Message } from "~/types/chat";

const API_URL = import.meta.env.VITE_CHAT_API_URL as string | undefined;

export async function sendMessage(messages: Message[]): Promise<string> {
  // Dev stub — no backend needed for UI development
  if (!API_URL) {
    return new Promise((resolve) =>
      setTimeout(
        () =>
          resolve(
            "This is a placeholder response. Set VITE_CHAT_API_URL to connect a real backend."
          ),
        1000
      )
    );
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  // Expects { reply: "..." } — adjust to match your backend
  return data.reply;
}
