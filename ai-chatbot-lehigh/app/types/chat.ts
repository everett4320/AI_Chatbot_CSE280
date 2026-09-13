export type Role = "user" | "assistant";

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
}
