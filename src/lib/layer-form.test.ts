import { describe, expect, it } from "vitest";

import {
  buildLayerCreate,
  buildLayerUpdate,
  buildMetadata,
  buildStyle,
  splitList,
} from "@/lib/layer-form";

describe("layer form", () => {
  it("splits comma separated lists and trims blanks", () => {
    expect(splitList("a, b ,,c ")).toEqual(["a", "b", "c"]);
    expect(splitList("")).toEqual([]);
    expect(splitList(undefined)).toEqual([]);
  });

  it("builds a generic Point layer with only provided advanced config", () => {
    const layer = buildLayerCreate({
      name: "Repeaters",
      slug: "repeaters",
      category: "radio",
      enabled: true,
    });
    expect(layer).toMatchObject({
      slug: "repeaters",
      name: "Repeaters",
      mode: "managed",
      geometry_types: ["Point"],
      enabled: true,
      style: {},
      metadata_: {},
    });
    expect(layer.description).toBeNull();
  });

  it("nests style and duplicate detection configuration", () => {
    const fields = {
      name: "L",
      slug: "l",
      category: "c",
      styleLabelProperty: "callsign",
      styleMarker: "tower",
      stylePopupProperties: "callsign, network",
      duplicateIdentityProperties: "callsign",
      duplicateCoordinateRadiusM: "300",
    };
    expect(buildStyle(fields)).toEqual({
      label_property: "callsign",
      marker: "tower",
      popup_properties: ["callsign", "network"],
    });
    expect(buildMetadata(fields)).toEqual({
      duplicate_detection: {
        identity_properties: ["callsign"],
        coordinate_radius_m: 300,
      },
    });
  });

  it("ignores non-positive or invalid radii and empty lists", () => {
    expect(
      buildMetadata({
        name: "L",
        category: "c",
        duplicateIdentityProperties: "",
        duplicateCoordinateRadiusM: "-5",
      }),
    ).toEqual({});
    expect(
      buildMetadata({
        name: "L",
        category: "c",
        duplicateCoordinateRadiusM: "abc",
      }),
    ).toEqual({});
  });

  it("builds a partial update payload", () => {
    expect(
      buildLayerUpdate({
        name: "Renamed",
        category: "c",
        enabled: false,
      }),
    ).toEqual({
      name: "Renamed",
      description: null,
      category: "c",
      enabled: false,
      style: {},
      metadata_: {},
    });
  });
});
