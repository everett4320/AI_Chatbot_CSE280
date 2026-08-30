import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { FeedbackRating, Message } from "~/types/chat";

interface ChatMessageProps {
  message: Message;
  onFeedback: (messageId: string, rating: FeedbackRating) => void;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  onFeedback,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <article className={`ross-message ross-message--${message.role}`}>
      {!isUser && <span className="ross-message__avatar" aria-hidden="true" />}
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
                  onClick={() => onFeedback(message.id, "up")}
                >
                  <span aria-hidden="true">👍</span>
                </button>
                <button
                  type="button"
                  className={message.feedback === "down" ? "is-selected" : ""}
                  aria-label="Not helpful"
                  aria-pressed={message.feedback === "down"}
                  onClick={() => onFeedback(message.id, "down")}
                >
                  <span aria-hidden="true">👎</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </article>
  );
});
