import Link from "next/link";

import { ErrorBanner } from "@/components/ErrorBanner";
import { Pagination } from "@/components/Pagination";
import { describeError } from "@/lib/errors";
import { listLayers } from "@/lib/geo-api";
import type { AdminLayer, Page } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LayersPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { cursor } = await searchParams;
  let page: Page<AdminLayer>;
  try {
    page = await listLayers(50, cursor);
  } catch (error) {
    return (
      <section className="space-y-4">
        <h1 className="text-xl font-semibold">Layers</h1>
        <ErrorBanner error={describeError(error)} />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Layers</h1>
        <Link
          href="/layers/new"
          className="rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white"
        >
          New layer
        </Link>
      </div>

      {page.items.length === 0 ? (
        <p className="text-sm text-gray-600">No layers yet.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-gray-600">
              <th className="py-2">Name</th>
              <th className="py-2">Category</th>
              <th className="py-2">Mode</th>
              <th className="py-2">Enabled</th>
              <th className="py-2">Features</th>
              <th className="py-2">Revision</th>
              <th className="py-2">Data updated</th>
            </tr>
          </thead>
          <tbody>
            {page.items.map((layer) => (
              <tr key={layer.id} className="border-b">
                <td className="py-2">
                  <Link className="text-blue-700 hover:underline" href={`/layers/${layer.id}`}>
                    {layer.name}
                  </Link>
                  <div className="text-xs text-gray-500">{layer.slug}</div>
                </td>
                <td className="py-2">{layer.category}</td>
                <td className="py-2">{layer.mode}</td>
                <td className="py-2">{layer.enabled ? "yes" : "no"}</td>
                <td className="py-2">{layer.feature_count}</td>
                <td className="py-2">{layer.revision}</td>
                <td className="py-2">
                  {layer.data_updated_at
                    ? new Date(layer.data_updated_at).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination basePath="/layers" nextCursor={page.next_cursor} hasCursor={Boolean(cursor)} />
    </section>
  );
}
