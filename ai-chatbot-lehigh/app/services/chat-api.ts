import type {
  ChatReply,
  FeedbackRating,
  Message,
  Source,
} from "~/types/chat";

const API_URL = import.meta.env.VITE_CHAT_API_URL as string | undefined;
const SESSION_STORAGE_KEY = "ross-chat-session-id";

export interface LehighApiResponse {
  Response?: string;
  Sources?: Array<{ title?: string; url?: string }>;
  sessionId?: string;
  questionId?: string;
  reply?: string;
  error?: string;
}

export interface QuestionPayload {
  action: "question";
  bot_name: "le-chat";
  httpMethod: "POST";
  userMessage: string;
  sessionId: string;
  questionId: string;
}

export interface FeedbackPayload {
  action: "feedback";
  bot_name: "le-chat";
  sessionId: string;
  questionId: string;
  feedback: "Good" | "Bad";
}

function createId(prefix: string) {
  const value =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}-${value}`;
}

function getSessionId() {
  if (typeof window === "undefined") return createId("session");

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const sessionId = createId("session");
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  return sessionId;
}

function normalizeSources(sources: LehighApiResponse["Sources"]): Source[] {
  if (!Array.isArray(sources)) return [];

  return sources.flatMap((source) => {
    if (!source.url) return [];
    return [
      {
        title: source.title?.trim() || source.url,
        url: source.url,
      },
    ];
  });
}

export function buildQuestionPayload(
  userMessage: string,
  sessionId: string,
  questionId: string,
): QuestionPayload {
  return {
    action: "question",
    bot_name: "le-chat",
    httpMethod: "POST",
    userMessage,
    sessionId,
    questionId,
  };
}

export function buildFeedbackPayload(
  sessionId: string,
  questionId: string,
  rating: FeedbackRating,
): FeedbackPayload {
  return {
    action: "feedback",
    bot_name: "le-chat",
    sessionId,
    questionId,
    feedback: rating === "up" ? "Good" : "Bad",
  };
}

export function parseChatReply(
  data: LehighApiResponse,
  fallback: { sessionId: string; questionId: string },
): ChatReply {
  if (data.error) throw new Error(data.error);

  const content = data.Response ?? data.reply;
  if (!content) throw new Error("The assistant returned an empty response.");

  return {
    content,
    sources: normalizeSources(data.Sources),
    sessionId: data.sessionId ?? fallback.sessionId,
    questionId: data.questionId ?? fallback.questionId,
  };
}

const PROGRAM_SOURCES: Source[] = [
  {
    title: "Undergraduate Studies — Rossin College",
    url: "https://engineering.lehigh.edu/academics/undergraduate",
  },
  {
    title: "Academic Programs — Lehigh Engineering",
    url: "https://engineering.lehigh.edu/academics",
  },
];

function createDemoReply(
  messages: Message[],
  sessionId: string,
  questionId: string,
): ChatReply {
  const latestQuestion =
    [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const normalized = latestQuestion.toLowerCase();

  if (normalized.includes("not sure") || normalized.includes("unsure")) {
    return {
      content: [
        "No worries! I can help narrow it down.",
        "",
        "What sounds most interesting to you?",
        "",
        "- Building software and intelligent systems",
        "- Designing machines and robotics",
        "- Improving infrastructure and the environment",
        "- Working with energy, electronics, or materials",
      ].join("\n"),
      sources: PROGRAM_SOURCES,
      sessionId,
      questionId,
    };
  }

  if (normalized.includes("undergraduate")) {
    return {
      content: [
        "## Undergraduate programs",
        "",
        "- Bioengineering",
        "- Chemical Engineering",
        "- Civil Engineering",
        "- Computer Engineering",
        "- Computer Science",
        "- Electrical Engineering",
        "- Industrial and Systems Engineering",
        "- Materials Science and Engineering",
        "- Mechanical Engineering",
        "",
        "Would you like to explore one of these programs?",
      ].join("\n"),
      sources: PROGRAM_SOURCES,
      sessionId,
      questionId,
    };
  }

  return {
    content: [
      "Here is a list of Lehigh University College of Engineering programs:",
      "",
      "### Undergraduate programs",
      "- Bioengineering",
      "- Chemical Engineering",
      "- Civil Engineering",
      "- Computer Engineering",
      "- Computer Science",
      "- Electrical Engineering",
      "- Industrial and Systems Engineering",
      "- Materials Science and Engineering",
      "- Mechanical Engineering",
      "",
      "### Interdisciplinary options",
      "- Integrated Business and Engineering",
      "- Integrated Degree in Engineering, Arts and Sciences",
      "",
      "Is there a specific area you would like to learn more about?",
    ].join("\n"),
    sources: PROGRAM_SOURCES,
    sessionId,
    questionId,
  };
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export async function sendMessage(messages: Message[]): Promise<ChatReply> {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  if (!latestUserMessage) throw new Error("No question was provided.");

  const sessionId = getSessionId();
  const questionId = createId("question");

  if (!API_URL) {
    await wait(900);
    return createDemoReply(messages, sessionId, questionId);
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      buildQuestionPayload(latestUserMessage.content, sessionId, questionId),
    ),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as LehighApiResponse;
  return parseChatReply(data, { sessionId, questionId });
}

export async function sendFeedback(
  questionId: string,
  rating: FeedbackRating,
): Promise<void> {
  if (!API_URL) {
    await wait(180);
    return;
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildFeedbackPayload(getSessionId(), questionId, rating)),
  });

  if (!res.ok) {
    throw new Error(`Feedback API error: ${res.status} ${res.statusText}`);
  }
}

export function resetChatSession() {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
}
