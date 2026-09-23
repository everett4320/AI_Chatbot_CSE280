import { useEffect, useState } from "react";
import { useChat } from "~/hooks/use-chat";
import { ChatArea } from "~/components/chat-area";

const rossMarkUrl = `${import.meta.env.BASE_URL}figma/ross-mark.svg`;

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    messages,
    isLoading,
    error,
    chatRevision,
    sendMessage,
    clearChat,
    rateMessage,
  } = useChat();

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateViewportMetrics = () => {
      const occludedBottom = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );

      document.documentElement.style.setProperty(
        "--ross-visual-viewport-height",
        `${viewport.height}px`,
      );
      document.documentElement.style.setProperty(
        "--ross-visual-viewport-bottom-offset",
        `${occludedBottom}px`,
      );
    };

    updateViewportMetrics();
    viewport.addEventListener("resize", updateViewportMetrics);
    viewport.addEventListener("scroll", updateViewportMetrics);

    return () => {
      viewport.removeEventListener("resize", updateViewportMetrics);
      viewport.removeEventListener("scroll", updateViewportMetrics);
      document.documentElement.style.removeProperty(
        "--ross-visual-viewport-height",
      );
      document.documentElement.style.removeProperty(
        "--ross-visual-viewport-bottom-offset",
      );
    };
  }, []);

  return (
    <div className="ross-widget">
      {isOpen && (
        <ChatArea
          messages={messages}
          isLoading={isLoading}
          error={error}
          chatRevision={chatRevision}
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
            <img src={rossMarkUrl} alt="" />
          </span>
          <span className="ross-launcher__status" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
