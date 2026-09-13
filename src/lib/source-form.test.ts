import { describe, expect, it } from "vitest";

import {
  SOURCE_HEALTH_LABEL,
  layerHref,
  sourceHealth,
  syncFeedback,
} from "@/lib/source-form";
import type { AdminSource } from "@/lib/types";

function source(overrides: Partial<AdminSource> = {}): AdminSource {
  return {
    id: "s1",
    layer_id: "l1",
    slug: "aemet-stations",
    adapter: "aemet_stations",
    dataset_id: "aemet",
    endpoint: null,
    enabled: true,
    status: "never",
    last_attempt_at: null,
    last_success_at: null,
    last_error: null,
    ...overrides,
  };
}

describe("sourceHealth", () => {
  it("classifies a successful enabled source as healthy", () => {
    const health = sourceHealth(source({ status: "success" }));
    expect(health).toBe("healthy");
    expect(SOURCE_HEALTH_LABEL[health]).toBe("HEALTHY");
  });

  it("classifies a failed enabled source as error", () => {
    const health = sourceHealth(source({ status: "failed" }));
    expect(health).toBe("error");
    expect(SOURCE_HEALTH_LABEL[health]).toBe("ERROR");
  });

  it("classifies a never-synced enabled source as never", () => {
    const health = sourceHealth(source({ status: "never" }));
    expect(health).toBe("never");
    expect(SOURCE_HEALTH_LABEL[health]).toBe("NEVER SYNCED");
  });

  it("classifies a disabled source as disabled regardless of status", () => {
    const health = sourceHealth(source({ enabled: false, status: "success" }));
    expect(health).toBe("disabled");
    expect(SOURCE_HEALTH_LABEL[health]).toBe("DISABLED");
  });
});

describe("layerHref", () => {
  it("links to the target layer detail page", () => {
    expect(layerHref("abc")).toBe("/layers/abc");
  });
});

describe("syncFeedback", () => {
  it("reports success and asks for a refresh", () => {
    const feedback = syncFeedback({ status: "success", last_error: null });
    expect(feedback.kind).toBe("success");
    expect(feedback.refresh).toBe(true);
  });

  it("reports failure without refreshing, preserving rendered data", () => {
    const feedback = syncFeedback({
      status: "failed",
      last_error: "upstream 503",
    });
    expect(feedback.kind).toBe("error");
    expect(feedback.refresh).toBe(false);
    expect(feedback.message).toContain("upstream 503");
    expect(feedback.message).toMatch(/unchanged/);
  });
});
