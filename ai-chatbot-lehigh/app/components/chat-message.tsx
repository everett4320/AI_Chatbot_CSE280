import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RossAvatar } from "~/components/ross-avatar";
import type { ChatErrorInfo, FeedbackRating, Message } from "~/types/chat";

interface ChatMessageProps {
  message: Message;
  onFeedback: (messageId: string, rating: FeedbackRating) => void;
  feedbackError?: ChatErrorInfo;
  isRating?: boolean;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  onFeedback,
  feedbackError,
  isRating = false,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <article className={`ross-message ross-message--${message.role}`}>
      {!isUser && <RossAvatar />}
      <div className="ross-message__bubble">
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <>
            <div className="ross-markdown">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ node: _node, ...props }) => (
                    <a {...props} target="_blank" rel="noreferrer" />
                  ),
                  table: ({ node: _node, ...props }) => (
                    <div
                      className="ross-table-scroll"
                      role="region"
                      aria-label="Scrollable answer table"
                      tabIndex={0}
                    >
                      <table {...props} />
                    </div>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
            {!!message.sources?.length && (
              <details className="ross-sources">
                <summary>Sources ({message.sources.length})</summary>
                <ol>
                  {message.sources.map((source, index) => (
                    <li key={`${source.url}-${source.title}-${index}`}>
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            )}
            <div className="ross-feedback" aria-label="Rate this answer">
              <span>Was this helpful?</span>
              <div className="ross-feedback__actions">
                <button
                  type="button"
                  className={message.feedback === "up" ? "is-selected" : ""}
                  aria-label="Helpful"
                  aria-pressed={message.feedback === "up"}
                  disabled={isRating}
                  onClick={() => onFeedback(message.id, "up")}
                >
                  <span aria-hidden="true">👍</span>
                </button>
                <button
                  type="button"
                  className={message.feedback === "down" ? "is-selected" : ""}
                  aria-label="Not helpful"
                  aria-pressed={message.feedback === "down"}
                  disabled={isRating}
                  onClick={() => onFeedback(message.id, "down")}
                >
                  <span aria-hidden="true">👎</span>
                </button>
              </div>
            </div>
            {feedbackError && (
              <div className="ross-feedback__error" role="status">
                <strong>{feedbackError.title}</strong>
                <span>{feedbackError.message}</span>
              </div>
            )}
          </>
        )}
      </div>
    </article>
  );
});
