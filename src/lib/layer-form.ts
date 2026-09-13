import type { LayerCreate, LayerUpdate } from "@/lib/types";

export type LayerFormFields = {
  name: string;
  slug?: string;
  description?: string;
  category: string;
  enabled?: boolean;
  styleLabelProperty?: string;
  styleMarker?: string;
  stylePopupProperties?: string;
  duplicateIdentityProperties?: string;
  duplicateCoordinateRadiusM?: string;
};

export function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function buildStyle(fields: LayerFormFields): Record<string, unknown> {
  const style: Record<string, unknown> = {};
  if (fields.styleLabelProperty?.trim()) style.label_property = fields.styleLabelProperty.trim();
  if (fields.styleMarker?.trim()) style.marker = fields.styleMarker.trim();
  const popup = splitList(fields.stylePopupProperties);
  if (popup.length) style.popup_properties = popup;
  return style;
}

export function buildMetadata(fields: LayerFormFields): Record<string, unknown> {
  const detection: Record<string, unknown> = {};
  const identity = splitList(fields.duplicateIdentityProperties);
  if (identity.length) detection.identity_properties = identity;
  const radius = fields.duplicateCoordinateRadiusM?.trim();
  if (radius) {
    const parsed = Number(radius);
    if (Number.isFinite(parsed) && parsed > 0) detection.coordinate_radius_m = parsed;
  }
  return Object.keys(detection).length ? { duplicate_detection: detection } : {};
}

export function buildLayerCreate(fields: LayerFormFields): LayerCreate {
  return {
    slug: (fields.slug ?? "").trim(),
    name: fields.name.trim(),
    description: fields.description?.trim() || null,
    category: fields.category.trim(),
    mode: "managed",
    geometry_types: ["Point"],
    enabled: fields.enabled ?? true,
    style: buildStyle(fields),
    metadata_: buildMetadata(fields),
  };
}

export function buildLayerUpdate(fields: LayerFormFields): LayerUpdate {
  return {
    name: fields.name.trim(),
    description: fields.description?.trim() || null,
    category: fields.category.trim(),
    enabled: fields.enabled ?? false,
    style: buildStyle(fields),
    metadata_: buildMetadata(fields),
  };
}
