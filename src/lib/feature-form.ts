import type { FeatureStatus, FeatureWrite, PointGeometry } from "@/lib/types";

export type PropertyType = "string" | "number" | "boolean" | "null";

export type PropertyRow = { key: string; type: PropertyType; value: string };

export function propertiesToRows(properties: Record<string, unknown>): PropertyRow[] {
  return Object.entries(properties).map(([key, value]) => {
    if (value === null) return { key, type: "null", value: "" };
    if (typeof value === "number") return { key, type: "number", value: String(value) };
    if (typeof value === "boolean") return { key, type: "boolean", value: String(value) };
    if (typeof value === "string") return { key, type: "string", value };
    return { key, type: "string", value: JSON.stringify(value) };
  });
}

function convertRow(row: PropertyRow): unknown {
  const key = row.key.trim();
  if (!key) throw new Error("Property key is required");
  switch (row.type) {
    case "null":
      return null;
    case "number": {
      const parsed = Number(row.value);
      if (row.value.trim() === "" || !Number.isFinite(parsed)) {
        throw new Error(`Invalid number for "${key}"`);
      }
      return parsed;
    }
    case "boolean":
      if (row.value === "true") return true;
      if (row.value === "false") return false;
      throw new Error(`Invalid boolean for "${key}" (use true or false)`);
    default:
      return row.value;
  }
}

export function rowsToProperties(rows: PropertyRow[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    result[key] = convertRow(row);
  }
  return result;
}

export function parsePropertiesJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (!trimmed) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    throw new Error(`Invalid JSON: ${(error as Error).message}`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Properties must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

export function parseCoordinate(value: string, label: string): number {
  const parsed = Number(value);
  if (value.trim() === "" || !Number.isFinite(parsed)) {
    throw new Error(`${label} must be a number`);
  }
  return parsed;
}

export type FeatureFormFields = {
  latitude: string;
  longitude: string;
  status: FeatureStatus;
  externalId?: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceRecordId?: string;
  propertiesJson: string;
};

export function buildFeatureWrite(fields: FeatureFormFields): FeatureWrite {
  const longitude = parseCoordinate(fields.longitude, "Longitude");
  const latitude = parseCoordinate(fields.latitude, "Latitude");
  const geometry: PointGeometry = { type: "Point", coordinates: [longitude, latitude] };
  return {
    geometry,
    properties: parsePropertiesJson(fields.propertiesJson),
    external_id: fields.externalId?.trim() || null,
    status: fields.status,
    source_type: "manual",
    source_name: fields.sourceName?.trim() || null,
    source_url: fields.sourceUrl?.trim() || null,
    source_record_id: fields.sourceRecordId?.trim() || null,
  };
}
