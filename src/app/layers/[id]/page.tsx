import Link from "next/link";

import { updateLayerAction } from "@/app/actions";
import { ErrorBanner } from "@/components/ErrorBanner";
import { LayerForm } from "@/components/LayerForm";
import { Pagination } from "@/components/Pagination";
import { describeError } from "@/lib/errors";
import { getLayer, listFeatures } from "@/lib/geo-api";
import { featureCoordinates } from "@/lib/map";
import { isManaged, type AdminFeature, type AdminLayer, type Page } from "@/lib/types";

export const dynamic = "force-dynamic";

function coordinatesLabel(feature: AdminFeature): string {
  const coordinates = featureCoordinates(feature);
  if (!coordinates) return feature.geometry?.type ?? "—";
  return `${coordinates[1].toFixed(5)}, ${coordinates[0].toFixed(5)}`;
}

export default async function LayerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cursor?: string; status?: string }>;
}) {
  const { id } = await params;
  const { cursor, status } = await searchParams;

  let layer: AdminLayer;
  let features: Page<AdminFeature>;
  try {
    layer = await getLayer(id);
    features = await listFeatures(id, { limit: 50, cursor, status });
  } catch (error) {
    return (
      <section className="space-y-4">
        <Link className="text-sm text-blue-700 hover:underline" href="/layers">
          ← Layers
        </Link>
        <ErrorBanner error={describeError(error)} />
      </section>
    );
  }

  const managed = isManaged(layer);
  const labelProperty =
    typeof layer.style?.label_property === "string" ? layer.style.label_property : undefined;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link className="text-sm text-blue-700 hover:underline" href="/layers">
            ← Layers
          </Link>
          <h1 className="text-xl font-semibold">{layer.name}</h1>
          <p className="text-sm text-gray-600">
            {layer.slug} · {layer.mode} · {layer.geometry_types.join(", ")}
          </p>
        </div>
        {managed && (
          <div className="flex gap-2">
            <Link
              href={`/layers/${layer.id}/imports`}
              className="rounded border px-3 py-1.5 text-sm font-medium hover:bg-gray-100"
            >
              Imports
            </Link>
            <Link
              href={`/layers/${layer.id}/features/new`}
              className="rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white"
            >
              Add point
            </Link>
          </div>
        )}
      </div>

      {!managed && (
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This is an external layer. Its features are managed by a source sync and are
          read-only here.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded border bg-white p-4 text-sm md:grid-cols-4">
        <div>
          <dt className="text-gray-500">Revision</dt>
          <dd>{layer.revision}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Data updated</dt>
          <dd>
            {layer.data_updated_at ? new Date(layer.data_updated_at).toLocaleString() : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Features</dt>
          <dd>{layer.feature_count}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Enabled</dt>
          <dd>{layer.enabled ? "yes" : "no"}</dd>
        </div>
        <div className="md:col-span-4">
          <dt className="text-gray-500">Description</dt>
          <dd>{layer.description || "—"}</dd>
        </div>
      </dl>

      <div className="rounded border bg-white p-4">
        <h2 className="mb-3 text-lg font-medium">
          {managed ? "Layer configuration" : "Layer metadata (read-only)"}
        </h2>
        {managed ? (
          <LayerForm action={updateLayerAction} layer={layer} />
        ) : (
          <pre className="overflow-auto rounded bg-gray-50 p-3 text-xs">
            {JSON.stringify(
              { style: layer.style, metadata_: layer.metadata_ },
              null,
              2,
            )}
          </pre>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Features</h2>
          <form className="text-sm" action={`/layers/${layer.id}`}>
            <label>
              Status:{" "}
              <select
                name="status"
                defaultValue={status ?? ""}
                className="rounded border px-2 py-1"
              >
                <option value="">all</option>
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="stale">stale</option>
                <option value="archived">archived</option>
              </select>
            </label>
            <button className="ml-2 rounded border px-2 py-1 hover:bg-gray-100">
              Filter
            </button>
          </form>
        </div>

        {features.items.length === 0 ? (
          <p className="text-sm text-gray-600">No features.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-gray-600">
                <th className="py-2">Label</th>
                <th className="py-2">Coordinates</th>
                <th className="py-2">Status</th>
                <th className="py-2">Updated</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {features.items.map((feature) => {
                const label =
                  (labelProperty && feature.properties?.[labelProperty]) ||
                  feature.external_id ||
                  feature.id.slice(0, 8);
                return (
                  <tr key={feature.id} className="border-b">
                    <td className="py-2">{String(label)}</td>
                    <td className="py-2 font-mono text-xs">
                      {coordinatesLabel(feature)}
                    </td>
                    <td className="py-2">{feature.status}</td>
                    <td className="py-2">
                      {new Date(feature.updated_at).toLocaleString()}
                    </td>
                    <td className="py-2 text-right">
                      <Link
                        className="text-blue-700 hover:underline"
                        href={`/features/${feature.id}`}
                      >
                        {managed ? "Edit" : "View"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <Pagination
          basePath={`/layers/${layer.id}`}
          params={{ status }}
          nextCursor={features.next_cursor}
          hasCursor={Boolean(cursor)}
        />
      </div>
    </section>
  );
}
