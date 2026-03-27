import { memo } from "react";
import type { Message } from "~/types/chat";

export const ASSISTANT_BUBBLE = "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 rounded-bl-md";

export const ChatMessage = memo(function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
          isUser
            ? "bg-lehigh-brown text-white rounded-br-md"
            : ASSISTANT_BUBBLE
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {message.content}
        </p>
      </div>
    </div>
  );
});
