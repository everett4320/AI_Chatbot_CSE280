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
    <main className="prototype-canvas">
      <h1 className="sr-only">Ross — Lehigh College of Engineering assistant</h1>
      <ChatWidget />
    </main>
  );
}
