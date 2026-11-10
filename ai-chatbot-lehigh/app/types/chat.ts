export type Role = "user" | "assistant";
export type FeedbackRating = "up" | "down";

export interface Source {
  title: string;
  url: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  sources?: Source[];
  questionId?: string;
  sessionId?: string;
  feedback?: FeedbackRating;
}

export interface ChatReply {
  content: string;
  sources: Source[];
  sessionId: string;
  questionId: string;
}
export type ChatErrorKind =
  | "timeout"
  | "service"
  | "rate_limit"
  | "access"
  | "invalid_response"
  | "network"
  | "configuration"
  | "request";

export interface ChatErrorInfo {
  kind: ChatErrorKind;
  title: string;
  message: string;
  retryable: boolean;
  details?: string;
}
