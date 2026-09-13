import { describe, expect, it } from "vitest";

import {
  buildFeatureWrite,
  parseCoordinate,
  parsePropertiesJson,
  propertiesToRows,
  rowsToProperties,
} from "@/lib/feature-form";

describe("feature form", () => {
  it("round-trips primitive property types", () => {
    const properties = {
      callsign: "EA1",
      power: 25,
      active: true,
      notes: null,
    };
    const rows = propertiesToRows(properties);
    expect(rows).toEqual([
      { key: "callsign", type: "string", value: "EA1" },
      { key: "power", type: "number", value: "25" },
      { key: "active", type: "boolean", value: "true" },
      { key: "notes", type: "null", value: "" },
    ]);
    expect(rowsToProperties(rows)).toEqual(properties);
  });

  it("rejects invalid numbers and booleans", () => {
    expect(() =>
      rowsToProperties([{ key: "power", type: "number", value: "abc" }]),
    ).toThrow(/Invalid number/);
    expect(() =>
      rowsToProperties([{ key: "active", type: "boolean", value: "yes" }]),
    ).toThrow(/Invalid boolean/);
  });

  it("validates advanced JSON mode strictly", () => {
    expect(parsePropertiesJson('{"a": 1}')).toEqual({ a: 1 });
    expect(parsePropertiesJson("")).toEqual({});
    expect(() => parsePropertiesJson("[1,2]")).toThrow(/JSON object/);
    expect(() => parsePropertiesJson("{oops}")).toThrow(/Invalid JSON/);
  });

  it("builds a Point FeatureWrite from coordinates", () => {
    const write = buildFeatureWrite({
      latitude: "40.4",
      longitude: "-3.7",
      status: "published",
      externalId: "ext-1",
      sourceName: "manual survey",
      propertiesJson: '{"callsign":"EA1"}',
    });
    expect(write.geometry).toEqual({ type: "Point", coordinates: [-3.7, 40.4] });
    expect(write.external_id).toBe("ext-1");
    expect(write.status).toBe("published");
    expect(write.source_type).toBe("manual");
    expect(write.properties).toEqual({ callsign: "EA1" });
    expect(write.source_name).toBe("manual survey");
  });

  it("rejects non-numeric coordinates", () => {
    expect(() => parseCoordinate("", "Latitude")).toThrow(/Latitude must be a number/);
    expect(() => parseCoordinate("north", "Latitude")).toThrow(/Latitude must be a number/);
  });
});
