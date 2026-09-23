import { useState, useCallback, useRef } from "react";
import type { FeedbackRating, Message } from "~/types/chat";
import {
  createId,
  resetChatSession,
  sendFeedback,
  sendMessage as sendApiMessage,
} from "~/services/chat-api";

export class ChatRequestEpoch {
  #value = 0;

  capture() {
    return this.#value;
  }

  invalidate() {
    this.#value += 1;
  }

  isCurrent(epoch: number) {
    return epoch === this.#value;
  }
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatRevision, setChatRevision] = useState(0);
  const loadingRef = useRef(false);
  const messagesRef = useRef(messages);
  const requestEpochRef = useRef(new ChatRequestEpoch());
  messagesRef.current = messages;

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || loadingRef.current) return;

    const userMessage: Message = {
      id: createId("message"),
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messagesRef.current, userMessage];
    const requestEpoch = requestEpochRef.current.capture();

    setError(null);
    loadingRef.current = true;
    setIsLoading(true);
    setMessages(updatedMessages);

    try {
      const reply = await sendApiMessage(updatedMessages);
      if (!requestEpochRef.current.isCurrent(requestEpoch)) return;

      const assistantMessage: Message = {
        id: createId("message"),
        role: "assistant",
        content: reply.content,
        timestamp: Date.now(),
        sources: reply.sources,
        questionId: reply.questionId,
        sessionId: reply.sessionId,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      if (!requestEpochRef.current.isCurrent(requestEpoch)) return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      if (!requestEpochRef.current.isCurrent(requestEpoch)) return;
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => {
    requestEpochRef.current.invalidate();
    resetChatSession();
    setMessages([]);
    setError(null);
    loadingRef.current = false;
    setIsLoading(false);
    setChatRevision((revision) => revision + 1);
  }, []);

  const rateMessage = useCallback(
    async (messageId: string, rating: FeedbackRating) => {
      const message = messagesRef.current.find((item) => item.id === messageId);
      if (!message?.questionId) return;
      const requestEpoch = requestEpochRef.current.capture();

      setMessages((current) =>
        current.map((item) =>
          item.id === messageId ? { ...item, feedback: rating } : item,
        ),
      );

      try {
        await sendFeedback(message.questionId, rating, message.sessionId);
      } catch (err) {
        if (!requestEpochRef.current.isCurrent(requestEpoch)) return;
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
    chatRevision,
    sendMessage,
    clearChat,
    rateMessage,
  };
}
