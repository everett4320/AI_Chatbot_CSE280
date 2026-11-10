import { ChatServiceError, errorInfo, httpError, kindFromErrorBody } from "./chat-errors";
import systemPrompt from "../../../christopher-handoff/backend-inputs/SYSTEM_PROMPT.txt?raw";
import type {
  ChatReply,
  FeedbackRating,
  Message,
  Source,
} from "~/types/chat";

const API_URL = import.meta.env.VITE_CHAT_API_URL as string | undefined;
const CONFIGURED_BOT_NAME = (
  import.meta.env.VITE_CHAT_BOT_NAME as string | undefined
)?.trim();
const SESSION_STORAGE_KEY_PREFIX = "ross-chat-session-id";
const CONFIGURATION_ERROR =
  "The chat service is not configured for this deployment. Please contact the site administrator.";
const BOT_NAME_CONFIGURATION_ERROR =
  "The chatbot identity is not configured for this deployment. Please contact the site administrator.";
let sessionEpoch = 0;

export const REQUEST_TIMEOUT_MS = 60_000;

export class ChatTimeoutError extends ChatServiceError {
  constructor(operation: "question" | "feedback" = "question", details?: string) {
    super(errorInfo("timeout", operation, details));
    this.name = "ChatTimeoutError";
  }
}

export interface LehighApiResponse {
  Response?: string;
  Sources?: Array<{ title?: string; url?: string }>;
  sessionId?: string;
  questionId?: string;
  error?: string;
}

export interface QuestionPayload {
  action: "question";
  bot_name: string;
  remember_conversation: "True";
  custom_prompt: string;
  httpMethod: "POST";
  userMessage: string;
  sessionId: string;
  questionId: string;
}

export interface FeedbackPayload {
  action: "feedback";
  bot_name: string;
  sessionId: string;
  questionId: string;
  feedback: "Good" | "Bad";
}

// crypto.randomUUID only exists in secure contexts (HTTPS or localhost), so
// e.g. a phone testing against http://192.168.x.x takes the fallback.
export function createId(prefix: string) {
  const value =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}-${value}`;
}

export function getSessionStorageKey(
  apiUrl = API_URL,
  botName = CONFIGURED_BOT_NAME,
) {
  const scope = `${apiUrl?.trim() || "demo"}|${botName?.trim() || "unconfigured"}`;
  return `${SESSION_STORAGE_KEY_PREFIX}:${encodeURIComponent(scope)}`;
}

export function getSessionId() {
  if (typeof window === "undefined") return createId("session");

  const storageKey = getSessionStorageKey();
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) return existing;

  const sessionId = createId("session");
  window.sessionStorage.setItem(storageKey, sessionId);
  return sessionId;
}

export function persistSessionId(sessionId: string, expectedEpoch = sessionEpoch) {
  const normalizedSessionId = sessionId.trim();
  if (
    !normalizedSessionId ||
    expectedEpoch !== sessionEpoch ||
    typeof window === "undefined"
  ) {
    return;
  }

  window.sessionStorage.setItem(getSessionStorageKey(), normalizedSessionId);
}

export function requireBotName(botName: string | undefined) {
  const normalizedBotName = botName?.trim();
  if (normalizedBotName) return normalizedBotName;
  throw new ChatServiceError({ ...errorInfo("configuration"), message: BOT_NAME_CONFIGURATION_ERROR });
}

function normalizeSources(sources: LehighApiResponse["Sources"]): Source[] {
  if (!Array.isArray(sources)) return [];

  // The backend often cites the same page several times in one answer.
  const seen = new Set<string>();
  return sources.flatMap((source) => {
    if (!source.url || seen.has(source.url)) return [];
    seen.add(source.url);
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
  botName: string,
): QuestionPayload {
  return {
    action: "question",
    bot_name: botName,
    remember_conversation: "True",
    custom_prompt: systemPrompt,
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
  botName: string,
): FeedbackPayload {
  return {
    action: "feedback",
    bot_name: botName,
    sessionId,
    questionId,
    feedback: rating === "up" ? "Good" : "Bad",
  };
}

export function parseChatReply(
  data: LehighApiResponse,
  fallback: { sessionId: string; questionId: string },
): ChatReply {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new ChatServiceError(errorInfo("invalid_response"));
  }
  if (data.error) {
    throw new ChatServiceError(errorInfo(kindFromErrorBody(data) ?? "request"));
  }

  const content = data.Response;
  if (typeof content !== "string" || !content.trim()) {
    throw new ChatServiceError(errorInfo("invalid_response"));
  }

  return {
    content,
    sources: normalizeSources(data.Sources),
    sessionId: data.sessionId ?? fallback.sessionId,
    questionId: data.questionId ?? fallback.questionId,
  };
}

const PROGRAM_SOURCES: Source[] = [
  {
    title: "P.C. Rossin College of Engineering and Applied Science",
    url: "https://engineering.lehigh.edu/",
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

export async function postToApi(
  apiUrl: string,
  payload: QuestionPayload | FeedbackPayload,
  options: { parseJson: boolean; timeoutMs?: number },
): Promise<LehighApiResponse | undefined> {
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const operation = payload.action;

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      let body: unknown;
      try {
        const text = await response.text();
        try {
          body = JSON.parse(text);
        } catch {
          // Empty or non-JSON responses use the HTTP status classification.
        }
      } catch {
        if (controller.signal.aborted) throw new ChatTimeoutError(operation);
      }
      if (response.status === 408 || response.status === 504) {
        throw new ChatTimeoutError(operation, `HTTP ${response.status}`);
      }
      throw httpError(response.status, operation, body);
    }

    if (options.parseJson) {
      try {
        return (await response.json()) as LehighApiResponse;
      } catch {
        if (controller.signal.aborted) throw new ChatTimeoutError(operation);
        throw new ChatServiceError(errorInfo("invalid_response", operation));
      }
    }

    await response.arrayBuffer();
    return undefined;
  } catch (error) {
    if (error instanceof ChatServiceError) throw error;
    if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
      throw new ChatTimeoutError(operation);
    }
    throw new ChatServiceError(errorInfo("network", operation));
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function sendMessage(messages: Message[]): Promise<ChatReply> {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  if (!latestUserMessage) throw new Error("No question was provided.");

  const sessionId = getSessionId();
  const requestSessionEpoch = sessionEpoch;
  const questionId = createId("question");

  if (!API_URL) {
    if (import.meta.env.PROD) throw new ChatServiceError({ ...errorInfo("configuration"), message: CONFIGURATION_ERROR });
    await wait(900);
    return createDemoReply(messages, sessionId, questionId);
  }

  const data = await postToApi(
    API_URL,
    buildQuestionPayload(
      latestUserMessage.content,
      sessionId,
      questionId,
      requireBotName(CONFIGURED_BOT_NAME),
    ),
    { parseJson: true },
  );

  if (!data) throw new ChatServiceError(errorInfo("invalid_response"));
  const reply = parseChatReply(data, { sessionId, questionId });
  persistSessionId(reply.sessionId, requestSessionEpoch);
  return reply;
}

export async function sendFeedback(
  questionId: string,
  rating: FeedbackRating,
  sessionId?: string,
): Promise<void> {
  if (!API_URL) {
    if (import.meta.env.PROD) throw new ChatServiceError({ ...errorInfo("configuration"), message: CONFIGURATION_ERROR });
    await wait(180);
    return;
  }

  await postToApi(
    API_URL,
    buildFeedbackPayload(
      sessionId?.trim() || getSessionId(),
      questionId,
      rating,
      requireBotName(CONFIGURED_BOT_NAME),
    ),
    { parseJson: false },
  );
}

export function resetChatSession() {
  sessionEpoch += 1;
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(getSessionStorageKey());
  }
}
