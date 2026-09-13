import Link from "next/link";

import { ErrorBanner } from "@/components/ErrorBanner";
import { SyncButton } from "@/components/SyncButton";
import { describeError } from "@/lib/errors";
import { getLayer, getSource } from "@/lib/geo-api";
import {
  SOURCE_HEALTH_LABEL,
  healthClassName,
  layerHref,
  sourceHealth,
} from "@/lib/source-form";
import { isManaged, type AdminLayer, type AdminSource } from "@/lib/types";

export const dynamic = "force-dynamic";

function timestamp(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let source: AdminSource;
  try {
    source = await getSource(id);
  } catch (error) {
    return (
      <section className="space-y-4">
        <Link className="text-sm text-blue-700 hover:underline" href="/sources">
          ← Sources
        </Link>
        <ErrorBanner error={describeError(error)} />
      </section>
    );
  }

  let layer: AdminLayer | null = null;
  try {
    layer = await getLayer(source.layer_id);
  } catch {
    layer = null;
  }

  const health = sourceHealth(source);
  const externalOwned = layer !== null && !isManaged(layer);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link className="text-sm text-blue-700 hover:underline" href="/sources">
            ← Sources
          </Link>
          <h1 className="text-xl font-semibold">{source.slug}</h1>
          <p className="text-sm text-gray-600">
            {source.adapter} · {source.dataset_id}
          </p>
        </div>
        <span
          className={`inline-block rounded border px-3 py-1 text-sm font-medium ${healthClassName(health)}`}
        >
          {SOURCE_HEALTH_LABEL[health]}
        </span>
      </div>

      {externalOwned && (
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This source owns an external layer. Its features are read-only from the managed
          feature editor; they change only when the source is synced.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded border bg-white p-4 text-sm md:grid-cols-4">
        <div>
          <dt className="text-gray-500">Slug</dt>
          <dd>{source.slug}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Provider / adapter</dt>
          <dd>{source.adapter}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Dataset</dt>
          <dd>{source.dataset_id}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Enabled</dt>
          <dd>{source.enabled ? "yes" : "no"}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Sync status</dt>
          <dd>{source.status}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Last attempt</dt>
          <dd>{timestamp(source.last_attempt_at)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Last success</dt>
          <dd>{timestamp(source.last_success_at)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Endpoint</dt>
          <dd className="break-all">{source.endpoint ?? "—"}</dd>
        </div>
        <div className="md:col-span-4">
          <dt className="text-gray-500">Target layer</dt>
          <dd>
            {layer ? (
              <Link className="text-blue-700 hover:underline" href={layerHref(layer.id)}>
                {layer.name} ({layer.slug}, {layer.feature_count} features)
              </Link>
            ) : (
              <span className="text-gray-500">unknown ({source.layer_id})</span>
            )}
          </dd>
        </div>
        <div className="md:col-span-4">
          <dt className="text-gray-500">Last error</dt>
          <dd className="break-words text-red-700">{source.last_error ?? "—"}</dd>
        </div>
      </dl>

      <div className="rounded border bg-white p-4">
        <h2 className="mb-3 text-lg font-medium">Manual sync</h2>
        <SyncButton sourceId={source.id} disabled={!source.enabled} />
      </div>

      <div className="rounded border bg-white p-4">
        <h2 className="mb-3 text-lg font-medium">Source metadata</h2>
        <pre className="overflow-auto rounded bg-gray-50 p-3 text-xs">
          {JSON.stringify(
            {
              adapter: source.adapter,
              dataset_id: source.dataset_id,
              endpoint: source.endpoint,
              enabled: source.enabled,
              status: source.status,
            },
            null,
            2,
          )}
        </pre>
      </div>
    </section>
  );
}
