"use client";

import { useActionState } from "react";

import { ErrorBanner } from "@/components/ErrorBanner";
import type { ActionState } from "@/lib/errors";
import type { AdminLayer } from "@/lib/types";

type ServerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

function listValue(value: unknown): string {
  return Array.isArray(value) ? value.join(", ") : "";
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function LayerForm({
  action,
  layer,
}: {
  action: ServerAction;
  layer?: AdminLayer;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const style = layer?.style ?? {};
  const detection =
    (layer?.metadata_?.duplicate_detection as Record<string, unknown> | undefined) ?? {};
  const radius = detection.coordinate_radius_m;

  return (
    <form action={formAction} className="space-y-4">
      {layer && <input type="hidden" name="layerId" value={layer.id} />}
      <ErrorBanner error={state?.error} />

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Name
          <input
            required
            name="name"
            defaultValue={layer?.name ?? ""}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="text-sm">
          Slug
          <input
            required
            name="slug"
            readOnly={Boolean(layer)}
            defaultValue={layer?.slug ?? ""}
            pattern="[a-z0-9][a-z0-9-]{0,99}"
            className="mt-1 w-full rounded border px-2 py-1 read-only:bg-gray-100"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Category
          <input
            required
            name="category"
            defaultValue={layer?.category ?? ""}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="mt-6 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={layer?.enabled ?? true}
            className="h-4 w-4"
          />
          Enabled
        </label>
      </div>

      <label className="block text-sm">
        Description
        <textarea
          name="description"
          defaultValue={layer?.description ?? ""}
          className="mt-1 h-20 w-full rounded border px-2 py-1"
        />
      </label>

      <fieldset className="space-y-3 rounded border p-3">
        <legend className="px-1 text-sm font-medium">Advanced configuration (optional)</legend>
        <div className="grid grid-cols-3 gap-3">
          <label className="text-sm">
            style.label_property
            <input
              name="styleLabelProperty"
              defaultValue={stringValue(style.label_property)}
              className="mt-1 w-full rounded border px-2 py-1"
            />
          </label>
          <label className="text-sm">
            style.marker
            <input
              name="styleMarker"
              defaultValue={stringValue(style.marker)}
              className="mt-1 w-full rounded border px-2 py-1"
            />
          </label>
          <label className="text-sm">
            style.popup_properties
            <input
              name="stylePopupProperties"
              placeholder="comma, separated"
              defaultValue={listValue(style.popup_properties)}
              className="mt-1 w-full rounded border px-2 py-1"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            metadata.duplicate_detection.identity_properties
            <input
              name="duplicateIdentityProperties"
              placeholder="comma, separated"
              defaultValue={listValue(detection.identity_properties)}
              className="mt-1 w-full rounded border px-2 py-1"
            />
          </label>
          <label className="text-sm">
            metadata.duplicate_detection.coordinate_radius_m
            <input
              name="duplicateCoordinateRadiusM"
              type="number"
              min="1"
              defaultValue={typeof radius === "number" ? String(radius) : ""}
              className="mt-1 w-full rounded border px-2 py-1"
            />
          </label>
        </div>
        <p className="text-xs text-gray-600">
          Duplicate detection only runs when identity properties or a coordinate radius are
          configured. Geometry type is fixed to Point for this checkpoint.
        </p>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : layer ? "Save layer" : "Create layer"}
      </button>
    </form>
  );
}
