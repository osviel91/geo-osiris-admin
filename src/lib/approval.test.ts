import { describe, expect, it } from "vitest";

import {
  APPROVAL_STATES,
  approvalStateExplanation,
  approvalStateLabel,
  canDecideApproval,
  shortFingerprint,
} from "@/lib/approval";

describe("approval helpers", () => {
  it("covers every approval state with a label", () => {
    for (const state of APPROVAL_STATES) {
      expect(approvalStateLabel(state)).toBeTruthy();
    }
    expect(approvalStateLabel("executed")).toBe("Published");
  });

  it("explains every non-pending state and leaves pending actionable", () => {
    expect(approvalStateExplanation("pending")).toBeNull();
    expect(approvalStateExplanation("stale")).toBe("Import changed after this request.");
    expect(approvalStateExplanation("expired")).toBe("This request expired.");
    expect(approvalStateExplanation("executed")).toBe("Already executed.");
  });

  it("only allows deciding a pending request", () => {
    expect(canDecideApproval("pending")).toBe(true);
    for (const state of APPROVAL_STATES.filter((value) => value !== "pending")) {
      expect(canDecideApproval(state)).toBe(false);
    }
  });

  it("shortens long fingerprints but leaves short ones intact", () => {
    const full = "8f7c2d1a00000000000000000000000000000000000000000000000000000091e4";
    expect(shortFingerprint(full)).toBe("8f7c2d1a…91e4");
    expect(shortFingerprint("short")).toBe("short");
  });
});
