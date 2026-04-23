import {
  useState,
  useRef,
  useEffect,
  type FormEvent,
  type KeyboardEvent,
} from "react";

interface ChatInputProps {
  onSend: (content: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-white px-5 pb-5 pt-2">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="flex-1 bg-lehigh-surface rounded-[8px] shadow-[0_4px_13.1px_rgba(0,0,0,0.08)] px-4 py-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Message input"
            placeholder="Ask a question..."
            rows={1}
            disabled={isLoading}
            className="w-full resize-none bg-transparent border-0 outline-none
                       text-[15px] leading-[1.35] text-lehigh-navy
                       placeholder:uppercase placeholder:tracking-[0.04em]
                       placeholder:text-lehigh-navy placeholder:opacity-80
                       disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="shrink-0 w-9 h-9 flex items-center justify-center
                     text-lehigh-navy hover:text-lehigh-navy-dark
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors"
          aria-label="Send message"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6"
          >
            <path d="M22 2 11 13" />
            <path d="M22 2 15 22l-4-9-9-4 20-7z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
