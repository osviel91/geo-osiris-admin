import Link from "next/link";

import { AdminMap } from "@/components/AdminMap";
import { ArchiveButton } from "@/components/ArchiveButton";
import { ErrorBanner } from "@/components/ErrorBanner";
import { describeError } from "@/lib/errors";
import { getFeature, getLayer } from "@/lib/geo-api";
import { featureToMapPoint, type MapPoint } from "@/lib/map";
import { isManaged, type AdminFeature, type AdminLayer } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

export default async function FeatureDetailPage({
  params,
}: {
  params: Promise<{ featureId: string }>;
}) {
  const { featureId } = await params;
  let feature: AdminFeature;
  let layer: AdminLayer;
  try {
    feature = await getFeature(featureId);
    layer = await getLayer(feature.layer_id);
  } catch (error) {
    return (
      <section className="space-y-4">
        <ErrorBanner error={describeError(error)} />
      </section>
    );
  }

  const managed = isManaged(layer);
  const labelProperty =
    typeof layer.style?.label_property === "string" ? layer.style.label_property : undefined;
  const mapPoint = featureToMapPoint(feature, labelProperty);
  const points: MapPoint[] = mapPoint ? [mapPoint] : [];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link className="text-sm text-blue-700 hover:underline" href={`/layers/${layer.id}`}>
            ← {layer.name}
          </Link>
          <h1 className="text-xl font-semibold">
            {mapPoint?.label ?? feature.external_id ?? feature.id}
          </h1>
          <p className="text-sm text-gray-600">
            {feature.status} · {feature.geometry?.type ?? "unknown geometry"}
          </p>
        </div>
        {managed && (
          <Link
            href={`/features/${feature.id}/edit`}
            className="rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white"
          >
            Edit feature
          </Link>
        )}
      </div>

      {!managed && (
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          External layer: this feature is read-only.
        </p>
      )}

      <AdminMap points={points} fit height={280} />

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded border bg-white p-4 text-sm md:grid-cols-3">
        <div>
          <dt className="text-gray-500">External ID</dt>
          <dd>{feature.external_id ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Created</dt>
          <dd>{formatDate(feature.created_at)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Updated</dt>
          <dd>{formatDate(feature.updated_at)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Verified</dt>
          <dd>{formatDate(feature.verified_at)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Archived</dt>
          <dd>{formatDate(feature.archived_at)}</dd>
        </div>
      </dl>

      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 text-lg font-medium">Properties</h2>
        <pre className="overflow-auto rounded bg-gray-50 p-3 text-xs">
          {JSON.stringify(feature.properties ?? {}, null, 2)}
        </pre>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Provenance</h2>
        {feature.provenance.length === 0 ? (
          <p className="text-sm text-gray-600">No provenance records.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-gray-600">
                <th className="py-2">Source type</th>
                <th className="py-2">Name</th>
                <th className="py-2">Record</th>
                <th className="py-2">By</th>
                <th className="py-2">Imported</th>
                <th className="py-2">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {feature.provenance.map((entry) => (
                <tr key={entry.id} className="border-b align-top">
                  <td className="py-2">{entry.source_type}</td>
                  <td className="py-2">
                    {entry.source_url ? (
                      <a
                        className="text-blue-700 hover:underline"
                        href={entry.source_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {entry.source_name ?? entry.source_url}
                      </a>
                    ) : (
                      entry.source_name ?? "—"
                    )}
                  </td>
                  <td className="py-2">{entry.source_record_id ?? "—"}</td>
                  <td className="py-2">{entry.created_by}</td>
                  <td className="py-2">{formatDate(entry.imported_at)}</td>
                  <td className="py-2 font-mono text-xs">
                    {JSON.stringify(entry.metadata_ ?? {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {managed && feature.status !== "archived" && (
        <ArchiveButton featureId={feature.id} layerId={layer.id} />
      )}
    </section>
  );
}
