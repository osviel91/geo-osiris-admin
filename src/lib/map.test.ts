import { describe, expect, it } from "vitest";

import {
  boundsOf,
  coordinateFromMapClick,
  featureToMapPoint,
  pointsToFeatureCollection,
  type MapPoint,
} from "@/lib/map";
import type { AdminFeature } from "@/lib/types";

function feature(overrides: Partial<AdminFeature> = {}): AdminFeature {
  return {
    id: "f1",
    layer_id: "l1",
    external_id: "ext-1",
    geometry: { type: "Point", coordinates: [-3.7, 40.4] },
    properties: { callsign: "EA1" },
    status: "published",
    created_at: "2026-09-13T00:00:00Z",
    updated_at: "2026-09-13T00:00:00Z",
    verified_at: null,
    archived_at: null,
    provenance: [],
    ...overrides,
  };
}

describe("admin map helpers", () => {
  it("turns a map click into coordinates and rejects malformed events", () => {
    expect(coordinateFromMapClick({ lngLat: { lng: -3.7, lat: 40.4 } })).toEqual({
      longitude: -3.7,
      latitude: 40.4,
    });
    expect(coordinateFromMapClick(null)).toBeNull();
    expect(coordinateFromMapClick({ lngLat: { lng: NaN, lat: 40 } })).toBeNull();
    expect(coordinateFromMapClick({})).toBeNull();
  });

  it("computes bounds for fitting, or null when empty", () => {
    expect(boundsOf([])).toBeNull();
    const points: MapPoint[] = [
      { id: "a", longitude: -3.7, latitude: 40.4, label: "a", properties: {} },
      { id: "b", longitude: -2.1, latitude: 41.9, label: "b", properties: {} },
    ];
    expect(boundsOf(points)).toEqual([
      [-3.7, 40.4],
      [-2.1, 41.9],
    ]);
  });

  it("maps a feature to a point using the configured label property", () => {
    expect(featureToMapPoint(feature(), "callsign")).toMatchObject({
      id: "f1",
      longitude: -3.7,
      latitude: 40.4,
      label: "EA1",
    });
    expect(featureToMapPoint(feature(), "missing")).toMatchObject({ label: "ext-1" });
  });

  it("skips features without usable coordinates", () => {
    expect(
      featureToMapPoint(feature({ geometry: { type: "Polygon", coordinates: [] } })),
    ).toBeNull();
  });

  it("serializes points as a GeoJSON feature collection", () => {
    const collection = pointsToFeatureCollection([
      { id: "a", longitude: 1, latitude: 2, label: "A", properties: { k: "v" } },
    ]);
    expect(collection.type).toBe("FeatureCollection");
    expect(collection.features[0]).toMatchObject({
      id: "a",
      geometry: { type: "Point", coordinates: [1, 2] },
      properties: { __label: "A", k: "v" },
    });
  });
});
