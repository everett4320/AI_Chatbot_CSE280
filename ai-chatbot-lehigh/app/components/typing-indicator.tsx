import { RossAvatar } from "~/components/ross-avatar";

export function TypingIndicator() {
  return (
    <div className="ross-typing" aria-label="Ross is typing" role="status">
      <RossAvatar />
      <div className="ross-typing__dots">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="ross-typing__dot"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
