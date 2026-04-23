import { memo } from "react";
import ReactMarkdown from "react-markdown";
import type { Message } from "~/types/chat";

export const ASSISTANT_BUBBLE =
  "bg-lehigh-mint text-lehigh-navy rounded-[8px] shadow-[0_4px_13.1px_rgba(0,0,0,0.08)]";

export const ChatMessage = memo(function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%] px-4 py-2.5 bg-lehigh-navy text-white rounded-[8px] shadow-[0_4px_13.1px_rgba(0,0,0,0.08)]">
          <p className="whitespace-pre-wrap break-words text-sm leading-snug text-right">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 mb-4">
      <div className="w-[29px] h-[29px] rounded-full bg-lehigh-mint shrink-0 mt-1" />
      <div className={`max-w-[85%] px-4 py-3 ${ASSISTANT_BUBBLE}`}>
        <div className="text-sm leading-[1.45] text-lehigh-navy">
          <ReactMarkdown
            components={{
              p: ({ node, ...props }) => (
                <p className="mb-2 last:mb-0" {...props} />
              ),
              strong: ({ node, ...props }) => (
                <strong className="font-bold" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc pl-5 my-1.5" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal pl-5 my-1.5" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="mb-0.5" {...props} />
              ),
              a: ({ node, ...props }) => (
                <a className="underline" {...props} />
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
});
