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
  }, [messages]);

  return (
    <div className="flex flex-col w-[400px] h-[620px] bg-white rounded-[12px] shadow-[0_4px_18.6px_rgba(0,0,0,0.11)] overflow-hidden">
      <header className="shrink-0 h-[70px] flex items-center gap-2 px-3 bg-lehigh-navy text-white">
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          aria-label="Collapse chat"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <polyline points="15 18 9 12 15 6" />
            <polyline points="19 18 13 12 19 6" />
          </svg>
        </button>
        <div className="w-[45px] h-[45px] flex items-center justify-center shrink-0">
          <div className="w-[30px] h-[30px] rotate-45 bg-lehigh-mint" />
        </div>
        <h1 className="flex-1 text-[22px] font-bold tracking-wide text-lehigh-mint leading-none">
          Ross
        </h1>
        <button
          type="button"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
          aria-label="Help"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="w-5 h-5"
          >
            <circle cx="12" cy="12" r="9.5" />
            <path d="M9.5 9a2.5 2.5 0 1 1 3.6 2.25c-.7.37-1.1.9-1.1 1.75v.5" strokeLinecap="round" />
            <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
          </svg>
        </button>
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

      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-4" role="log" aria-live="polite">
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

      {error && (
        <div className="mx-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-3 py-2 mb-2 text-xs" role="alert">
          {error}
        </div>
      )}

      <ChatInput onSend={onSend} isLoading={isLoading} />
    </div>
  );
}
