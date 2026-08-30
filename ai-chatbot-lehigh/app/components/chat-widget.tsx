import { useState } from "react";
import { useChat } from "~/hooks/use-chat";
import { ChatArea } from "~/components/chat-area";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    rateMessage,
  } = useChat();

  return (
    <div className="ross-widget">
      {isOpen && (
        <ChatArea
          messages={messages}
          isLoading={isLoading}
          error={error}
          onSend={sendMessage}
          onClose={() => setIsOpen(false)}
          onRestart={clearChat}
          onFeedback={rateMessage}
        />
      )}

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="ross-launcher"
          aria-label="Open Ross chat"
        >
          <span className="ross-launcher__diamond" aria-hidden="true">
            <img src="/figma/ross-mark.svg" alt="" />
          </span>
          <span className="ross-launcher__status" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
