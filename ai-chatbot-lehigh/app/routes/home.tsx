import type { Route } from "./+types/home";
import { ChatWidget } from "~/components/chat-widget";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "AI Chatbot - Lehigh College of Engineering" },
    { name: "description", content: "AI Chatbot for Lehigh College of Engineering" },
  ];
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Lehigh CSE280
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Click the chat icon in the bottom-right corner to talk with the AI
          assistant.
        </p>
      </div>
      <ChatWidget />
    </main>
  );
}
