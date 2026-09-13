import Link from "next/link";

import { ErrorBanner } from "@/components/ErrorBanner";
import { Pagination } from "@/components/Pagination";
import { describeError } from "@/lib/errors";
import { listLayers, listSources } from "@/lib/geo-api";
import {
  SOURCE_HEALTH_LABEL,
  healthClassName,
  layerHref,
  sourceHealth,
} from "@/lib/source-form";
import type { AdminLayer, AdminSource, Page } from "@/lib/types";

export const dynamic = "force-dynamic";

function timestamp(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { cursor } = await searchParams;
  let sources: Page<AdminSource>;
  let layers: AdminLayer[];
  try {
    sources = await listSources({ limit: 50, cursor });
    layers = (await listLayers(500)).items;
  } catch (error) {
    return (
      <section className="space-y-4">
        <h1 className="text-xl font-semibold">Sources</h1>
        <ErrorBanner error={describeError(error)} />
      </section>
    );
  }

  const layerById = new Map(layers.map((layer) => [layer.id, layer]));

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">External sources</h1>

      {sources.items.length === 0 ? (
        <p className="text-sm text-gray-600">No external sources configured.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-gray-600">
              <th className="py-2">Source</th>
              <th className="py-2">Target layer</th>
              <th className="py-2">Provider</th>
              <th className="py-2">Status</th>
              <th className="py-2">Last attempt</th>
              <th className="py-2">Last success</th>
              <th className="py-2">Last error</th>
            </tr>
          </thead>
          <tbody>
            {sources.items.map((source) => {
              const layer = layerById.get(source.layer_id);
              const health = sourceHealth(source);
              return (
                <tr key={source.id} className="border-b align-top">
                  <td className="py-2">
                    <Link
                      className="text-blue-700 hover:underline"
                      href={`/sources/${source.id}`}
                    >
                      {source.slug}
                    </Link>
                  </td>
                  <td className="py-2">
                    {layer ? (
                      <Link
                        className="text-blue-700 hover:underline"
                        href={layerHref(layer.id)}
                      >
                        {layer.name}
                      </Link>
                    ) : (
                      <span className="text-gray-500">unknown</span>
                    )}
                    <div className="text-xs text-gray-500">
                      {layer ? `${layer.feature_count} features` : source.layer_id.slice(0, 8)}
                    </div>
                  </td>
                  <td className="py-2">
                    {source.adapter}
                    <div className="text-xs text-gray-500">{source.dataset_id}</div>
                  </td>
                  <td className="py-2">
                    <span
                      className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${healthClassName(health)}`}
                    >
                      {SOURCE_HEALTH_LABEL[health]}
                    </span>
                  </td>
                  <td className="py-2">{timestamp(source.last_attempt_at)}</td>
                  <td className="py-2">{timestamp(source.last_success_at)}</td>
                  <td className="py-2 max-w-xs truncate text-xs text-red-700">
                    {source.last_error ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Pagination
        basePath="/sources"
        nextCursor={sources.next_cursor}
        hasCursor={Boolean(cursor)}
      />
    </section>
  );
}
