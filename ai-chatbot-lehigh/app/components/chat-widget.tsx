import { useEffect, useRef, useState } from "react";
import { useChat } from "~/hooks/use-chat";
import { ChatArea } from "~/components/chat-area";

const rossMarkUrl = `${import.meta.env.BASE_URL}figma/ross-mark.svg`;

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  // Only pull focus back to the launcher after a close we caused, never on the
  // first render (the widget starts closed and must not steal focus).
  const restoreFocusRef = useRef(false);
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    rateMessage,
  } = useChat();

  // Esc is handled inside ChatArea, on the panel element, so the widget never
  // reacts to keystrokes aimed at the host page.
  const closePanel = () => {
    restoreFocusRef.current = true;
    setIsOpen(false);
  };

  // The launcher is unmounted while the panel is open, so focus has to wait
  // until React has put it back.
  useEffect(() => {
    if (isOpen || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    launcherRef.current?.focus();
  }, [isOpen]);

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
          onSend={sendMessage}
          onClose={closePanel}
          onRestart={clearChat}
          onFeedback={rateMessage}
        />
      )}

      {!isOpen && (
        <button
          ref={launcherRef}
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
