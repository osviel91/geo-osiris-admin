import type { AdminFeature } from "@/lib/types";

export type MapPoint = {
  id: string;
  longitude: number;
  latitude: number;
  label: string;
  properties: Record<string, unknown>;
};

export type MapClickEvent = { lngLat?: { lng: number; lat: number } } | null;

export function coordinateFromMapClick(
  event: MapClickEvent,
): { longitude: number; latitude: number } | null {
  const lng = event?.lngLat?.lng;
  const lat = event?.lngLat?.lat;
  if (typeof lng !== "number" || typeof lat !== "number") return null;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { longitude: lng, latitude: lat };
}

export function featureCoordinates(feature: AdminFeature): [number, number] | null {
  const coordinates = feature.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const [longitude, latitude] = coordinates;
  if (typeof longitude !== "number" || typeof latitude !== "number") return null;
  return [longitude, latitude];
}

export function featureToMapPoint(
  feature: AdminFeature,
  labelProperty?: string,
): MapPoint | null {
  const coordinates = featureCoordinates(feature);
  if (!coordinates) return null;
  const label =
    (labelProperty && feature.properties?.[labelProperty]) ??
    feature.external_id ??
    feature.id.slice(0, 8);
  return {
    id: feature.id,
    longitude: coordinates[0],
    latitude: coordinates[1],
    label: String(label),
    properties: feature.properties ?? {},
  };
}

export function pointsToFeatureCollection(points: MapPoint[]) {
  return {
    type: "FeatureCollection" as const,
    features: points.map((point) => ({
      type: "Feature" as const,
      id: point.id,
      geometry: {
        type: "Point" as const,
        coordinates: [point.longitude, point.latitude],
      },
      properties: { __label: point.label, ...point.properties },
    })),
  };
}

export function boundsOf(points: MapPoint[]): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const point of points) {
    minLon = Math.min(minLon, point.longitude);
    maxLon = Math.max(maxLon, point.longitude);
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
  }
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}
