import { describe, expect, it } from "vitest";
import { inboundMessageType } from "./message-type";

describe("inboundMessageType", () => {
  it("classifies a plain text message", () => {
    expect(inboundMessageType({ type: "text" })).toBe("text");
  });

  it("classifies an interactive button reply", () => {
    expect(inboundMessageType({ type: "interactive", interactive: { type: "button_reply" } })).toBe("button_reply");
  });

  it("classifies an interactive list reply", () => {
    expect(inboundMessageType({ type: "interactive", interactive: { type: "list_reply" } })).toBe("list_reply");
  });

  it("classifies an interactive message with an unrecognized sub-type as unsupported", () => {
    expect(inboundMessageType({ type: "interactive", interactive: { type: "nfm_reply" } })).toBe("unsupported");
  });

  it("classifies anything else (image, audio, unknown) as unsupported", () => {
    expect(inboundMessageType({ type: "image" })).toBe("unsupported");
    expect(inboundMessageType({})).toBe("unsupported");
  });
});
