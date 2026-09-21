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

const paperPlaneUrl = `${import.meta.env.BASE_URL}figma/paper-plane.png`;

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
    const supportsDesktopFocus = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;
    if (!supportsDesktopFocus) return;

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
    // Enter during IME composition (e.g. picking a pinyin candidate) confirms
    // the candidate, not the message. Safari reports it as keyCode 229 instead.
    if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
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
          // Not disabled while Ross is answering: disabling a focused textarea
          // blurs it, so every reply forced a click back into the input.
          // handleSubmit already refuses to send while isLoading.
          className="ross-composer__input"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="ross-composer__send"
          aria-label="Send message"
          // Keep focus in the textarea when the button is clicked or tapped.
          onMouseDown={(e) => e.preventDefault()}
        >
          <img src={paperPlaneUrl} alt="" />
        </button>
      </form>
    </div>
  );
}
