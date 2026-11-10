import { useState, useCallback, useRef } from "react";
import type { ChatErrorInfo, FeedbackRating, Message } from "~/types/chat";
import { getChatErrorInfo } from "~/services/chat-errors";
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
  const [error, setError] = useState<ChatErrorInfo | null>(null);
  const [feedbackErrors, setFeedbackErrors] = useState<
    Record<string, ChatErrorInfo>
  >({});
  const [pendingFeedbackIds, setPendingFeedbackIds] = useState<string[]>([]);
  const [chatRevision, setChatRevision] = useState(0);
  const loadingRef = useRef(false);
  const messagesRef = useRef(messages);
  const requestEpochRef = useRef(new ChatRequestEpoch());
  const failedQuestionRef = useRef<string | null>(null);
  const pendingFeedbackRef = useRef(new Set<string>());
  messagesRef.current = messages;

  const requestAnswer = useCallback(async (updatedMessages: Message[]) => {
    if (loadingRef.current) return;
    const requestEpoch = requestEpochRef.current.capture();

    setError(null);
    failedQuestionRef.current = null;
    loadingRef.current = true;
    setIsLoading(true);
    messagesRef.current = updatedMessages;
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
      const info = getChatErrorInfo(err);
      failedQuestionRef.current = info.retryable
        ? updatedMessages.at(-1)?.id ?? null
        : null;
      setError(info);
    } finally {
      if (!requestEpochRef.current.isCurrent(requestEpoch)) return;
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || loadingRef.current) return;

      await requestAnswer([
        ...messagesRef.current,
        {
          id: createId("message"),
          role: "user",
          content: trimmed,
          timestamp: Date.now(),
        },
      ]);
    },
    [requestAnswer],
  );

  const retryMessage = useCallback(async () => {
    if (failedQuestionRef.current === messagesRef.current.at(-1)?.id) {
      await requestAnswer(messagesRef.current);
    }
  }, [requestAnswer]);

  const clearChat = useCallback(() => {
    requestEpochRef.current.invalidate();
    resetChatSession();
    setMessages([]);
    messagesRef.current = [];
    setError(null);
    setFeedbackErrors({});
    failedQuestionRef.current = null;
    pendingFeedbackRef.current.clear();
    setPendingFeedbackIds([]);
    loadingRef.current = false;
    setIsLoading(false);
    setChatRevision((revision) => revision + 1);
  }, []);

  const rateMessage = useCallback(
    async (messageId: string, rating: FeedbackRating) => {
      const message = messagesRef.current.find((item) => item.id === messageId);
      if (!message?.questionId || pendingFeedbackRef.current.has(messageId)) {
        return;
      }
      const requestEpoch = requestEpochRef.current.capture();
      pendingFeedbackRef.current.add(messageId);
      setPendingFeedbackIds([...pendingFeedbackRef.current]);
      setFeedbackErrors((current) => {
        const next = { ...current };
        delete next[messageId];
        return next;
      });

      setMessages((current) =>
        current.map((item) =>
          item.id === messageId ? { ...item, feedback: rating } : item,
        ),
      );

      try {
        await sendFeedback(message.questionId, rating, message.sessionId);
      } catch (err) {
        if (!requestEpochRef.current.isCurrent(requestEpoch)) return;
        setMessages((current) =>
          current.map((item) =>
            item.id === messageId ? { ...item, feedback: message.feedback } : item,
          ),
        );
        setFeedbackErrors((current) => ({
          ...current,
          [messageId]: getChatErrorInfo(err, "feedback"),
        }));
      } finally {
        if (requestEpochRef.current.isCurrent(requestEpoch)) {
          pendingFeedbackRef.current.delete(messageId);
          setPendingFeedbackIds([...pendingFeedbackRef.current]);
        }
      }
    },
    [],
  );

  return {
    messages,
    isLoading,
    error,
    feedbackErrors,
    pendingFeedbackIds,
    chatRevision,
    sendMessage,
    retryMessage,
    clearChat,
    rateMessage,
  };
}
