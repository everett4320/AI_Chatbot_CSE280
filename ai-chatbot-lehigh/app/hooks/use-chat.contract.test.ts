import { describe, expect, it } from "vitest";
import { ChatRequestEpoch } from "./use-chat";

describe("chat request lifecycle", () => {
  it("rejects a stale completion after the user starts a new chat", () => {
    const epoch = new ChatRequestEpoch();
    const pendingRequest = epoch.capture();

    epoch.invalidate();

    expect(epoch.isCurrent(pendingRequest)).toBe(false);
    expect(epoch.isCurrent(epoch.capture())).toBe(true);
  });
});
