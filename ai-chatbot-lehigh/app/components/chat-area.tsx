import { useRef, useEffect, useState } from "react";
import type { ChatErrorInfo, FeedbackRating, Message } from "~/types/chat";
import { ChatMessage } from "~/components/chat-message";
import { ChatInput } from "~/components/chat-input";
import { TypingIndicator } from "~/components/typing-indicator";
import { ChatErrorNotice } from "~/components/chat-error-notice";

const figmaAssetBase = `${import.meta.env.BASE_URL}figma/`;

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  error: ChatErrorInfo | null;
  feedbackErrors: Record<string, ChatErrorInfo>;
  pendingFeedbackIds: string[];
  chatRevision: number;
  onSend: (content: string) => void;
  onRetry: () => void;
  onClose: () => void;
  onRestart: () => void;
  onFeedback: (messageId: string, rating: FeedbackRating) => void;
}

export function ChatArea({
  messages,
  isLoading,
  error,
  feedbackErrors,
  pendingFeedbackIds,
  chatRevision,
  onSend,
  onRetry,
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
  }, [messages, isLoading, error]);

  const handleNewChat = () => {
    onRestart();
    setShowHelp(false);
  };

  return (
    <section className="ross-panel" aria-label="Ross, Lehigh engineering assistant">
      <header className="ross-header">
        <div className="ross-header__identity">
          <img
            className="ross-brand-mark"
            src={`${figmaAssetBase}ross-header.png`}
            alt=""
          />
          <h1>Ross</h1>
        </div>

        <div className="ross-header__actions">
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
        </div>
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
            <h2>Hi, I’m Ross, your guide to the Rossin College of Engineering here at Lehigh.</h2>
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
                feedbackError={feedbackErrors[message.id]}
                isRating={pendingFeedbackIds.includes(message.id)}
              />
            ))}
            {isLoading && <TypingIndicator />}
            {error && (
              <ChatErrorNotice
                error={error}
                onRetry={onRetry}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      )}

      {!hasConversation && error && (
        <ChatErrorNotice
          error={error}
          onRetry={onRetry}
          isLoading={isLoading}
          welcome
        />
      )}

      <ChatInput key={chatRevision} onSend={onSend} isLoading={isLoading} />
    </section>
  );
}
