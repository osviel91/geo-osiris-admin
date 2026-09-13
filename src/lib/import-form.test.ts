import { describe, expect, it } from "vitest";

import {
  buildCsvMapping,
  commitBlockedReason,
  formatReason,
} from "@/lib/import-form";
import type { AdminImport, CandidateReason } from "@/lib/types";

function summary(overrides: Partial<AdminImport> = {}): AdminImport {
  return {
    id: "i1",
    layer_id: "l1",
    filename: "a.csv",
    format: "csv",
    status: "validated",
    row_count: 10,
    valid_count: 10,
    invalid_count: 0,
    candidate_count: 0,
    resolved_candidate_count: 0,
    unresolved_candidate_count: 0,
    source_name: null,
    source_url: null,
    created_at: "2026-09-13T00:00:00Z",
    committed_at: null,
    cancelled_at: null,
    ...overrides,
  };
}

describe("buildCsvMapping", () => {
  it("builds the normalized mapping contract for coordinates and external id", () => {
    const mapping = buildCsvMapping(["lon", "lat", "call"], {
      longitude: "lon",
      latitude: "lat",
      externalId: "call",
      properties: { call: "callsign" },
    });
    expect(mapping).toEqual({
      longitude: "lon",
      latitude: "lat",
      external_id: "call",
      properties: {},
    });
  });

  it("maps arbitrary property columns and renames them", () => {
    const mapping = buildCsvMapping(["x", "y", "name", "band"], {
      longitude: "x",
      latitude: "y",
      externalId: "",
      properties: { name: "site_name", band: "band", x: "ignored" },
    });
    expect(mapping.external_id).toBeNull();
    expect(mapping.properties).toEqual({ site_name: "name", band: "band" });
  });

  it("rejects missing or duplicate coordinate columns", () => {
    expect(() =>
      buildCsvMapping(["lon", "lat"], {
        longitude: "lon",
        latitude: "lon",
        externalId: "",
        properties: {},
      }),
    ).toThrow(/different columns/);
    expect(() =>
      buildCsvMapping(["lon", "lat"], {
        longitude: "lon",
        latitude: "missing",
        externalId: "",
        properties: {},
      }),
    ).toThrow(/latitude column/);
  });
});

describe("formatReason", () => {
  it("renders backend reasons generically", () => {
    const reasons: CandidateReason[] = [
      { type: "external_id", value: "EA1" },
      { type: "property_exact", property: "callsign", value: "EA1" },
      { type: "spatial_proximity", distance_m: 42.7, threshold_m: 300 },
      { type: "future_reason" },
    ];
    expect(reasons.map(formatReason)).toEqual([
      "Exact external ID: EA1",
      "callsign exact match: EA1",
      "42.7 m away (threshold 300 m)",
      "future_reason",
    ]);
  });
});

describe("commit eligibility from the server aggregate", () => {
  it("allows commit when there are no invalid rows and no unresolved candidates", () => {
    expect(commitBlockedReason(summary())).toBeNull();
    expect(
      commitBlockedReason(
        summary({
          candidate_count: 3,
          resolved_candidate_count: 3,
          unresolved_candidate_count: 0,
        }),
      ),
    ).toBeNull();
  });

  it("blocks commit while invalid rows remain", () => {
    expect(commitBlockedReason(summary({ invalid_count: 2 }))).toMatch(/invalid rows/);
  });

  it("blocks commit while candidates are unresolved", () => {
    expect(
      commitBlockedReason(
        summary({
          candidate_count: 3,
          resolved_candidate_count: 1,
          unresolved_candidate_count: 2,
        }),
      ),
    ).toMatch(/duplicate candidate/);
  });
});
