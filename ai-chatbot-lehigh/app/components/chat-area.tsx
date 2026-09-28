import { useRef, useEffect, useState, type KeyboardEvent } from "react";
import type { FeedbackRating, Message } from "~/types/chat";
import { ChatMessage } from "~/components/chat-message";
import { ChatInput } from "~/components/chat-input";
import { TypingIndicator } from "~/components/typing-indicator";

const figmaAssetBase = `${import.meta.env.BASE_URL}figma/`;

// The five topics College of Engineering faculty and staff said they are asked
// about most often (survey question C1-5, 42 respondents), in frequency order:
// program requirements 25, career outcomes 25, research 21, student experience
// 16, graduate pathways / 4+1 12.
const STARTER_QUESTIONS = [
  "What are the degree requirements for an engineering major?",
  "What jobs do Lehigh engineering graduates get?",
  "How can I get involved in undergraduate research?",
  "What engineering clubs and student projects can I join?",
  "How does the 4+1 master\u2019s program work?",
];

// Hidden until the wording is final. Set to true to show them on the welcome
// screen; the list above is the only thing that should need editing.
const SHOW_STARTER_QUESTIONS = false;

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

  // Esc only closes Ross when focus is inside the panel. Ross is embedded in a
  // host page, so it must not swallow Esc aimed at the page's own controls.
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    // Esc during IME composition dismisses the candidate window, not the panel.
    if (event.key !== "Escape" || event.nativeEvent.isComposing) return;
    event.stopPropagation();
    onClose();
  };

  const handleBack = () => {
    if (hasConversation) handleNewChat();
    else onClose();
  };

  return (
    <section
      className="ross-panel"
      aria-label="Ross, Lehigh engineering assistant"
      onKeyDown={handleKeyDown}
      // Lets a click on a non-interactive part of the panel keep focus inside
      // it, so Esc still reaches this handler.
      tabIndex={-1}
    >
      <header className="ross-header">
        <div className="ross-header__identity">
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
            <h2>Hello, I’m Ross, your guide to Lehigh College of Engineering</h2>
            <p>How can I assist you today?</p>

            {SHOW_STARTER_QUESTIONS && (
              <ul className="ross-starters" aria-label="Suggested questions">
                {STARTER_QUESTIONS.map((question) => (
                  <li key={question}>
                    <button
                      type="button"
                      className="ross-starter"
                      onClick={() => onSend(question)}
                      disabled={isLoading}
                    >
                      {question}
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
