import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AudioOrb } from "@/components/audio-orb";

describe("AudioOrb", () => {
  it("always exposes a text label for a voice state", () => {
    render(<AudioOrb state="recording" />);
    expect(screen.getByRole("status")).toHaveTextContent("Listening to you");
  });

  it("supports a reduced visual-only variant without an empty status region", () => {
    const { container } = render(<AudioOrb state="ready" showLabel={false} />);
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});
