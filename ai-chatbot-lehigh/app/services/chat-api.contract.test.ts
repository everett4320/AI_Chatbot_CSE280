import { describe, expect, it } from "vitest";
import {
  buildFeedbackPayload,
  buildQuestionPayload,
  parseChatReply,
} from "./chat-api";

describe("Lehigh chatbot API contract", () => {
  it("builds the existing question payload without backend changes", () => {
    expect(
      buildQuestionPayload(
        "What programs are there?",
        "session-abc1234",
        "question-def5678",
      ),
    ).toEqual({
      action: "question",
      bot_name: "le-chat",
      httpMethod: "POST",
      userMessage: "What programs are there?",
      sessionId: "session-abc1234",
      questionId: "question-def5678",
    });
  });

  it("parses Markdown, sources, and backend identifiers", () => {
    expect(
      parseChatReply(
        {
          Response: "## Programs\n\n- Bioengineering\n- Computer Science",
          Sources: [
            {
              title: "Academic Programs",
              url: "https://engineering.lehigh.edu/academics",
            },
          ],
          sessionId: "session-from-backend",
          questionId: "question-from-backend",
        },
        { sessionId: "fallback-session", questionId: "fallback-question" },
      ),
    ).toEqual({
      content: "## Programs\n\n- Bioengineering\n- Computer Science",
      sources: [
        {
          title: "Academic Programs",
          url: "https://engineering.lehigh.edu/academics",
        },
      ],
      sessionId: "session-from-backend",
      questionId: "question-from-backend",
    });
  });

  it.each([
    ["up", "Good"],
    ["down", "Bad"],
  ] as const)("maps %s feedback to the existing %s value", (rating, feedback) => {
    expect(
      buildFeedbackPayload("session-abc1234", "question-def5678", rating),
    ).toEqual({
      action: "feedback",
      bot_name: "le-chat",
      sessionId: "session-abc1234",
      questionId: "question-def5678",
      feedback,
    });
  });
});
