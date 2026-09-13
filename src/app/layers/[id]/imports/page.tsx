import Link from "next/link";

import { ErrorBanner } from "@/components/ErrorBanner";
import { Pagination } from "@/components/Pagination";
import { describeError } from "@/lib/errors";
import { getLayer, listImports } from "@/lib/geo-api";
import { isManaged, type AdminImport, type AdminLayer, type Page } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

export default async function LayerImportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { id } = await params;
  const { cursor } = await searchParams;

  let layer: AdminLayer;
  let imports: Page<AdminImport>;
  try {
    layer = await getLayer(id);
    imports = await listImports(id, { limit: 50, cursor });
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

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link className="text-sm text-blue-700 hover:underline" href={`/layers/${layer.id}`}>
            ← {layer.name}
          </Link>
          <h1 className="text-xl font-semibold">Imports</h1>
          <p className="text-sm text-gray-600">{layer.slug}</p>
        </div>
        {managed && (
          <Link
            href={`/layers/${layer.id}/imports/new`}
            className="rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white"
          >
            New import
          </Link>
        )}
      </div>

      {imports.items.length === 0 ? (
        <p className="text-sm text-gray-600">No imports yet.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-gray-600">
              <th className="py-2">File</th>
              <th className="py-2">State</th>
              <th className="py-2">Created</th>
              <th className="py-2">Rows</th>
              <th className="py-2">Valid</th>
              <th className="py-2">Invalid</th>
              <th className="py-2">Candidates</th>
            </tr>
          </thead>
          <tbody>
            {imports.items.map((job) => (
              <tr key={job.id} className="border-b">
                <td className="py-2">
                  <Link className="text-blue-700 hover:underline" href={`/imports/${job.id}`}>
                    {job.filename}
                  </Link>
                  <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs uppercase">
                    {job.format}
                  </span>
                </td>
                <td className="py-2">
                  {job.status}
                  {job.committed_at && (
                    <span className="block text-xs text-gray-500">
                      {formatDate(job.committed_at)}
                    </span>
                  )}
                  {job.cancelled_at && (
                    <span className="block text-xs text-gray-500">
                      {formatDate(job.cancelled_at)}
                    </span>
                  )}
                </td>
                <td className="py-2">{formatDate(job.created_at)}</td>
                <td className="py-2">{job.row_count}</td>
                <td className="py-2">{job.valid_count}</td>
                <td className="py-2">{job.invalid_count}</td>
                <td className="py-2">{job.candidate_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination
        basePath={`/layers/${layer.id}/imports`}
        nextCursor={imports.next_cursor}
        hasCursor={Boolean(cursor)}
      />
    </section>
  );
}
