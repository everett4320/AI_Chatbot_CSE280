import { ASSISTANT_BUBBLE } from "~/components/chat-message";

export function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4" aria-label="Assistant is typing">
      <div className={`${ASSISTANT_BUBBLE} rounded-2xl px-4 py-3 flex items-center gap-1`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
