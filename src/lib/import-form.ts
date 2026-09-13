import type { AdminImport, CandidateReason, CsvMapping, CsvPropertyType } from "@/lib/types";

export const MAX_IMPORT_BYTES = 5_000_000;

export type CsvSelection = {
  longitude: string;
  latitude: string;
  externalId: string;
  properties: Record<string, { name: string; type: CsvPropertyType }>;
};

export function buildCsvMapping(headers: string[], selection: CsvSelection): CsvMapping {
  if (!selection.longitude || !headers.includes(selection.longitude)) {
    throw new Error("Select a longitude column");
  }
  if (!selection.latitude || !headers.includes(selection.latitude)) {
    throw new Error("Select a latitude column");
  }
  if (selection.longitude === selection.latitude) {
    throw new Error("Longitude and latitude must use different columns");
  }
  if (selection.externalId && !headers.includes(selection.externalId)) {
    throw new Error("Select a valid external ID column");
  }
  const reserved = new Set(
    [selection.longitude, selection.latitude, selection.externalId].filter(Boolean),
  );
  const properties: CsvMapping["properties"] = {};
  for (const [column, propertySelection] of Object.entries(selection.properties)) {
    const property = propertySelection.name.trim();
    if (!property || reserved.has(column)) continue;
    properties[property] = { column, type: propertySelection.type };
  }
  return {
    longitude: selection.longitude,
    latitude: selection.latitude,
    external_id: selection.externalId || null,
    properties,
  };
}

export function formatReason(reason: CandidateReason): string {
  switch (reason.type) {
    case "external_id":
      return `Exact external ID: ${String(reason.value)}`;
    case "property_exact":
      return `${reason.property ?? "property"} exact match: ${String(reason.value)}`;
    case "spatial_proximity":
      return `${reason.distance_m ?? "?"} m away (threshold ${reason.threshold_m ?? "?"} m)`;
    default:
      return reason.type;
  }
}

export function commitBlockedReason(
  summary: Pick<AdminImport, "invalid_count" | "unresolved_candidate_count">,
): string | null {
  if (summary.invalid_count > 0) {
    return "Resolve invalid rows before committing.";
  }
  if (summary.unresolved_candidate_count > 0) {
    return "Resolve every duplicate candidate (skip or import anyway) before committing.";
  }
  return null;
}

export function isCommitted(summary: AdminImport): boolean {
  return summary.status === "committed";
}

export function isPending(summary: AdminImport): boolean {
  return summary.status === "validated";
}
