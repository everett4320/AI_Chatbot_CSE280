import { useRef, useEffect, useState } from "react";
import type { FeedbackRating, Message } from "~/types/chat";
import { ChatMessage } from "~/components/chat-message";
import { ChatInput } from "~/components/chat-input";
import { TypingIndicator } from "~/components/typing-indicator";

const figmaAssetBase = `${import.meta.env.BASE_URL}figma/`;

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  chatRevision: number;
  onSend: (content: string) => void;
  onClose: () => void;
  onRestart: () => void;
  onFeedback: (messageId: string, rating: FeedbackRating) => void;
}

export function ChatArea({
  messages,
  isLoading,
  error,
  chatRevision,
  onSend,
  onClose,
  onRestart,
  onFeedback,
}: ChatAreaProps) {
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [showHelp, setShowHelp] = useState(false);
  const hasConversation = messages.length > 0;

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (transcript) {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      transcript.scrollTo({
        top: transcript.scrollHeight,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }
  }, [messages, isLoading]);

  const handleNewChat = () => {
    onRestart();
    setShowHelp(false);
  };

  const handleBack = () => {
    if (hasConversation) handleNewChat();
    else onClose();
  };

  return (
    <section className="ross-panel" aria-label="Ross, Lehigh engineering assistant">
      <header className="ross-header">
        <button
          type="button"
          className="ross-header__icon ross-header__back"
          onClick={handleBack}
          aria-label={hasConversation ? "Start a new conversation" : "Minimize chat"}
        >
          <img src={`${figmaAssetBase}collapse.png`} alt="" />
        </button>

        <span className="ross-brand-mark" aria-hidden="true">
          <img src={`${figmaAssetBase}ross-mark.svg`} alt="" />
        </span>
        <h1>Ross</h1>

        <button
          type="button"
          className="ross-header__new-chat"
          onClick={handleNewChat}
          aria-label="Start a new chat"
        >
          NEW CHAT
        </button>

        <button
          type="button"
          className="ross-header__icon ross-header__help"
          onClick={() => setShowHelp((value) => !value)}
          aria-label="Chat help"
          aria-expanded={showHelp}
        >
          <img src={`${figmaAssetBase}help.png`} alt="" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="ross-header__icon ross-header__close"
          aria-label="Close chat"
        >
          <img src={`${figmaAssetBase}close.png`} alt="" />
        </button>
      </header>

      {showHelp && (
        <div className="ross-help-popover" role="status">
          <strong>Ask Ross about Lehigh Engineering.</strong>
          <span>Enter sends · Shift + Enter adds a new line.</span>
        </div>
      )}

      {!hasConversation ? (
        <div className="ross-welcome">
          <div className="ross-welcome__copy">
            <h2>Hello, I’m Ross, your guide to Lehigh College of Engineering</h2>
            <p>How can I assist you today?</p>
          </div>
        </div>
      ) : (
        <div
          ref={transcriptRef}
          className={`ross-transcript ${isLoading ? "ross-transcript--pending" : ""}`}
          role="log"
          aria-live="polite"
        >
          <div className="ross-transcript__content">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onFeedback={onFeedback}
              />
            ))}
            {isLoading && <TypingIndicator />}
            {error && (
              <div className="ross-error" role="alert">
                <strong>Ross couldn’t answer just now.</strong>
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {!hasConversation && error && (
        <div className="ross-error ross-error--welcome" role="alert">
          <strong>Ross couldn’t connect.</strong>
          <span>{error}</span>
        </div>
      )}

      <ChatInput key={chatRevision} onSend={onSend} isLoading={isLoading} />
    </section>
  );
}
