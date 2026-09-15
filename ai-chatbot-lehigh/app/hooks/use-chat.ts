import { useState, useCallback, useRef } from "react";
import type { FeedbackRating, Message } from "~/types/chat";
import {
  resetChatSession,
  sendFeedback,
  sendMessage as sendApiMessage,
} from "~/services/chat-api";

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
        content: reply.content,
        timestamp: Date.now(),
        sources: reply.sources,
        questionId: reply.questionId,
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
    resetChatSession();
    setMessages([]);
    setError(null);
    loadingRef.current = false;
    setIsLoading(false);
    resetSession();
  }, []);

  const rateMessage = useCallback(
    async (messageId: string, rating: FeedbackRating) => {
      const message = messagesRef.current.find((item) => item.id === messageId);
      if (!message?.questionId) return;

      setMessages((current) =>
        current.map((item) =>
          item.id === messageId ? { ...item, feedback: rating } : item,
        ),
      );

      try {
        await sendFeedback(message.questionId, rating);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Feedback could not be submitted.",
        );
      }
    },
    [],
  );

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    rateMessage,
  };
}
