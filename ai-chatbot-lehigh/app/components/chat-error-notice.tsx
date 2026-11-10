import type { ChatErrorInfo } from "~/types/chat";

interface ChatErrorNoticeProps {
  error: ChatErrorInfo;
  onRetry: () => void;
  isLoading: boolean;
  welcome?: boolean;
}

export function ChatErrorNotice({
  error,
  onRetry,
  isLoading,
  welcome = false,
}: ChatErrorNoticeProps) {
  return (
    <div
      className={`ross-error${welcome ? " ross-error--welcome" : ""}`}
      role="alert"
    >
      <strong>{error.title}</strong>
      <span>{error.message}</span>
      {error.retryable && (
        <button
          type="button"
          className="ross-error__retry"
          onClick={onRetry}
          disabled={isLoading}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M3 10a9 9 0 1 1 2.65 8.36" />
            <path d="M3 4v6h6" />
          </svg>
          <span>Try again</span>
        </button>
      )}
    </div>
  );
}
