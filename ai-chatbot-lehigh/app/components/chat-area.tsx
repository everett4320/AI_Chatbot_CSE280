import { useRef, useEffect } from "react";
import type { Message } from "~/types/chat";
import { ChatMessage } from "~/components/chat-message";
import { ChatInput } from "~/components/chat-input";
import { TypingIndicator } from "~/components/typing-indicator";

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  onSend: (content: string) => void;
  onClose: () => void;
}

export function ChatArea({
  messages,
  isLoading,
  error,
  onSend,
  onClose,
}: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col w-[370px] h-[500px] bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-[#502D0E] text-white">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">
          🤖
        </div>
        <h1 className="flex-1 text-base font-semibold">Lehigh AI Chatbot</h1>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
          aria-label="Close chat"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M6.225 4.811a1 1 0 0 0-1.414 1.414L10.586 12 4.81 17.775a1 1 0 1 0 1.414 1.414L12 13.414l5.775 5.775a1 1 0 0 0 1.414-1.414L13.414 12l5.775-5.775a1 1 0 0 0-1.414-1.414L12 10.586 6.225 4.811Z" />
          </svg>
        </button>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <div className="px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <div className="text-3xl mb-3">💬</div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Ask a question
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isLoading && <TypingIndicator />}
            </>
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-3 py-2 mb-2 text-xs">
            {error}
          </div>
        </div>
      )}

      {/* Input area */}
      <ChatInput onSend={onSend} isLoading={isLoading} />
    </div>
  );
}
