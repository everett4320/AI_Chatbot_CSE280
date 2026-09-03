import { useState, useCallback, useRef } from "react";
import type { Message } from "~/types/chat";
import { sendMessage as sendApiMessage, resetSession } from "~/services/chat-api";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || loadingRef.current) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };

    setError(null);
    loadingRef.current = true;
    setIsLoading(true);
    setMessages([...messagesRef.current, userMessage]);

    try {
      const { reply, sources } = await sendApiMessage(trimmed);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
        sources,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    loadingRef.current = false;
    setIsLoading(false);
    resetSession();
  }, []);

  return { messages, isLoading, error, sendMessage, clearChat };
}
