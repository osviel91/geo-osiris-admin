"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import {
  archiveFeature,
  createFeature,
  createLayer,
  updateFeature,
  updateLayer,
} from "@/lib/geo-api";
import { describeError, type ActionState } from "@/lib/errors";
import { buildFeatureWrite, type FeatureFormFields } from "@/lib/feature-form";
import {
  buildLayerCreate,
  buildLayerUpdate,
  type LayerFormFields,
} from "@/lib/layer-form";
import type { FeatureStatus } from "@/lib/types";

function unauthorized(): ActionState {
  return { error: { status: 401, message: "Authentication required." } };
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function layerFields(formData: FormData): LayerFormFields {
  return {
    name: str(formData, "name"),
    slug: str(formData, "slug"),
    description: str(formData, "description"),
    category: str(formData, "category"),
    enabled: formData.get("enabled") === "on" || formData.get("enabled") === "true",
    styleLabelProperty: str(formData, "styleLabelProperty"),
    styleMarker: str(formData, "styleMarker"),
    stylePopupProperties: str(formData, "stylePopupProperties"),
    duplicateIdentityProperties: str(formData, "duplicateIdentityProperties"),
    duplicateCoordinateRadiusM: str(formData, "duplicateCoordinateRadiusM"),
  };
}

function featureFields(formData: FormData): FeatureFormFields {
  return {
    latitude: str(formData, "latitude"),
    longitude: str(formData, "longitude"),
    status: (str(formData, "status") || "draft") as FeatureStatus,
    externalId: str(formData, "externalId"),
    sourceName: str(formData, "sourceName"),
    sourceUrl: str(formData, "sourceUrl"),
    sourceRecordId: str(formData, "sourceRecordId"),
    propertiesJson: str(formData, "propertiesJson"),
  };
}

export async function createLayerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return unauthorized();
  const fields = layerFields(formData);
  if (!fields.name.trim() || !fields.slug?.trim() || !fields.category.trim()) {
    return { error: { status: 422, message: "Name, slug and category are required." } };
  }
  let created: { id: string; slug: string };
  try {
    created = await createLayer(buildLayerCreate(fields));
  } catch (error) {
    return { error: describeError(error) };
  }
  revalidatePath("/layers");
  redirect(`/layers/${created.id}`);
}

export async function updateLayerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return unauthorized();
  const layerId = str(formData, "layerId");
  const fields = layerFields(formData);
  if (!layerId) return { error: { status: 422, message: "Missing layer id." } };
  try {
    await updateLayer(layerId, buildLayerUpdate(fields));
  } catch (error) {
    return { error: describeError(error) };
  }
  revalidatePath(`/layers/${layerId}`);
  redirect(`/layers/${layerId}`);
}

export async function createFeatureAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return unauthorized();
  const layerId = str(formData, "layerId");
  if (!layerId) return { error: { status: 422, message: "Missing layer id." } };
  let created: { id: string };
  try {
    created = await createFeature(layerId, buildFeatureWrite(featureFields(formData)));
  } catch (error) {
    return { error: describeError(error) };
  }
  revalidatePath(`/layers/${layerId}`);
  redirect(`/features/${created.id}`);
}

export async function updateFeatureAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return unauthorized();
  const featureId = str(formData, "featureId");
  if (!featureId) return { error: { status: 422, message: "Missing feature id." } };
  try {
    await updateFeature(featureId, buildFeatureWrite(featureFields(formData)));
  } catch (error) {
    return { error: describeError(error) };
  }
  revalidatePath(`/features/${featureId}`);
  redirect(`/features/${featureId}`);
}

export async function archiveFeatureAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return unauthorized();
  const featureId = str(formData, "featureId");
  const layerId = str(formData, "layerId");
  if (!featureId) return { error: { status: 422, message: "Missing feature id." } };
  try {
    await archiveFeature(featureId);
  } catch (error) {
    return { error: describeError(error) };
  }
  revalidatePath(`/layers/${layerId}`);
  redirect(`/layers/${layerId}`);
}
