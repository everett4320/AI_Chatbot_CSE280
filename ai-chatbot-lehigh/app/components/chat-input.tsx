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
      textarea.style.height = `${Math.min(textarea.scrollHeight, 84)}px`;
    }
  }, [input]);

  useEffect(() => {
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 240);
    return () => window.clearTimeout(timer);
  }, []);

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
    <div className="ross-composer-wrap">
      <form onSubmit={handleSubmit} className="ross-composer">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Message input"
          placeholder="ASK A QUESTION..."
          rows={1}
          disabled={isLoading}
          className="ross-composer__input"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="ross-composer__send"
          aria-label="Send message"
        >
          <img src="/figma/paper-plane.png" alt="" />
        </button>
      </form>
    </div>
  );
}
