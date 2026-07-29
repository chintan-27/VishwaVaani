import { createActor } from "xstate";
import { describe, expect, it } from "vitest";

import { voiceMachine } from "@/components/voice-session";

describe("voice session state machine", () => {
  it("covers the standard coach turn", () => {
    const actor = createActor(voiceMachine).start();
    expect(actor.getSnapshot().value).toBe("connecting");
    actor.send({ type: "CONNECTED" });
    actor.send({ type: "AGENT_DONE" });
    actor.send({ type: "START_TALK" });
    actor.send({ type: "STOP_TALK" });
    expect(actor.getSnapshot().value).toBe("thinking");
    actor.send({ type: "RESPONSE_READY" });
    expect(actor.getSnapshot().value).toBe("agent_speaking");
  });

  it("pauses and resumes without inventing a score", () => {
    const actor = createActor(voiceMachine).start();
    actor.send({ type: "CONNECTED" });
    actor.send({ type: "AGENT_DONE" });
    actor.send({ type: "PAUSE" });
    expect(actor.getSnapshot().value).toBe("paused");
    actor.send({ type: "RESUME" });
    expect(actor.getSnapshot().value).toBe("ready");
  });

  it("supports explicit failure and completion states", () => {
    const failed = createActor(voiceMachine).start();
    failed.send({ type: "FAIL" });
    expect(failed.getSnapshot().value).toBe("failed");

    const completed = createActor(voiceMachine).start();
    completed.send({ type: "CONNECTED" });
    completed.send({ type: "AGENT_DONE" });
    completed.send({ type: "START_TALK" });
    completed.send({ type: "STOP_TALK" });
    completed.send({ type: "COMPLETE" });
    expect(completed.getSnapshot().value).toBe("completed");
  });
});
