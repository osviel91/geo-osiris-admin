"use client";

import { useActionState, useMemo, useState } from "react";

import { AdminMap } from "@/components/AdminMap";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PropertiesEditor } from "@/components/PropertiesEditor";
import type { ActionState } from "@/lib/errors";
import type { MapPoint } from "@/lib/map";
import { featureToMapPoint } from "@/lib/map";
import type { AdminFeature, FeatureStatus } from "@/lib/types";

type ServerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

const STATUSES: FeatureStatus[] = ["draft", "published", "stale", "archived"];

export function FeatureForm({
  action,
  layerId,
  feature,
  siblingFeatures = [],
  labelProperty,
}: {
  action: ServerAction;
  layerId: string;
  feature?: AdminFeature;
  siblingFeatures?: AdminFeature[];
  labelProperty?: string;
}) {
  const initial = feature?.geometry?.type === "Point" ? feature.geometry.coordinates : null;
  const [longitude, setLongitude] = useState(
    Array.isArray(initial) ? String(initial[0]) : "",
  );
  const [latitude, setLatitude] = useState(
    Array.isArray(initial) ? String(initial[1]) : "",
  );
  const [propertiesJson, setPropertiesJson] = useState(
    JSON.stringify(feature?.properties ?? {}),
  );
  const [propertiesValid, setPropertiesValid] = useState(true);
  const [state, formAction, pending] = useActionState(action, null);

  const siblingPoints = useMemo(
    () =>
      siblingFeatures
        .map((item) => featureToMapPoint(item, labelProperty))
        .filter((point): point is MapPoint => point !== null),
    [siblingFeatures, labelProperty],
  );

  const draftPoint = useMemo<MapPoint[]>(() => {
    const lon = Number(longitude);
    const lat = Number(latitude);
    if (longitude === "" || latitude === "" || !Number.isFinite(lon) || !Number.isFinite(lat)) {
      return [];
    }
    return [
      {
        id: "__draft",
        longitude: lon,
        latitude: lat,
        label: "New point",
        properties: {},
      },
    ];
  }, [longitude, latitude]);

  const points = feature
    ? [...siblingPoints.filter((point) => point.id !== feature.id), ...draftPoint]
    : [...siblingPoints, ...draftPoint];

  return (
    <form action={formAction} className="space-y-4">
      {feature ? (
        <input type="hidden" name="featureId" value={feature.id} />
      ) : (
        <input type="hidden" name="layerId" value={layerId} />
      )}
      <input type="hidden" name="propertiesJson" value={propertiesJson} />

      <ErrorBanner error={state?.error} />

      <AdminMap
        points={points}
        fit
        onMapClick={({ longitude: lon, latitude: lat }) => {
          setLongitude(lon.toFixed(6));
          setLatitude(lat.toFixed(6));
        }}
      />
      <p className="text-xs text-gray-600">
        Click the map to set the point, or edit the coordinates below.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Latitude
          <input
            className="mt-1 w-full rounded border px-2 py-1"
            name="latitude"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
          />
        </label>
        <label className="text-sm">
          Longitude
          <input
            className="mt-1 w-full rounded border px-2 py-1"
            name="longitude"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Status
          <select
            className="mt-1 w-full rounded border px-2 py-1"
            name="status"
            defaultValue={feature?.status ?? "draft"}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          External ID
          <input
            className="mt-1 w-full rounded border px-2 py-1"
            name="externalId"
            defaultValue={feature?.external_id ?? ""}
          />
        </label>
      </div>

      <PropertiesEditor initial={feature?.properties ?? {}} onChange={(json, valid) => {
        setPropertiesJson(json);
        setPropertiesValid(valid);
      }} />

      <fieldset className="space-y-3 rounded border p-3">
        <legend className="px-1 text-sm font-medium">Provenance / source (optional)</legend>
        <div className="grid grid-cols-3 gap-3">
          <label className="text-sm">
            Source name
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              name="sourceName"
              defaultValue=""
            />
          </label>
          <label className="text-sm">
            Source URL
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              name="sourceUrl"
              defaultValue=""
            />
          </label>
          <label className="text-sm">
            Source record ID
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              name="sourceRecordId"
              defaultValue=""
            />
          </label>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={pending || !propertiesValid}
        className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : feature ? "Save changes" : "Create point"}
      </button>
    </form>
  );
}
