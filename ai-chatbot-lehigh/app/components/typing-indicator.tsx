import { ASSISTANT_BUBBLE } from "~/components/chat-message";

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 mb-4" aria-label="Assistant is typing">
      <div className="w-[29px] h-[29px] rounded-full bg-lehigh-mint shrink-0 mt-1" />
      <div className={`${ASSISTANT_BUBBLE} px-4 py-3 flex items-center gap-1`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 bg-lehigh-navy rounded-full animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
