import type { Message } from "~/types/chat";

const API_URL = import.meta.env.VITE_CHAT_API_URL as string | undefined;

export async function sendMessage(messages: Message[]): Promise<string> {
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
    return new Promise((resolve) => setTimeout(() => resolve(stub), 600));
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
  return data.reply;
}
