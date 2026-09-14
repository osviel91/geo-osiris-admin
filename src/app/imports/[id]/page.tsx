import Link from "next/link";

import { ErrorBanner } from "@/components/ErrorBanner";
import { ImportActions } from "@/components/ImportActions";
import { ImportRowResolution } from "@/components/ImportRowResolution";
import { Pagination } from "@/components/Pagination";
import { approvalStateExplanation, approvalStateLabel } from "@/lib/approval";
import { describeError } from "@/lib/errors";
import { getImport, listApprovals, listImportRows } from "@/lib/geo-api";
import { formatReason } from "@/lib/import-form";
import type { AdminImport, AdminImportRow, ImportApproval, Page } from "@/lib/types";

export const dynamic = "force-dynamic";

const FILTERS = [
  { label: "All", value: "" },
  { label: "Invalid", value: "invalid" },
  { label: "Candidates", value: "candidate" },
  { label: "Valid", value: "valid" },
];

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

function coordinatesLabel(row: AdminImportRow): string {
  const geometry = row.geometry;
  if (geometry?.type === "Point" && Array.isArray(geometry.coordinates)) {
    const [lon, lat] = geometry.coordinates as [number, number];
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
  return geometry?.type ?? "—";
}

export default async function ImportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cursor?: string; state?: string }>;
}) {
  const { id } = await params;
  const { cursor, state } = await searchParams;

  let summary: AdminImport;
  let rows: Page<AdminImportRow>;
  let approvals: Page<ImportApproval>;
  try {
    summary = await getImport(id);
    rows = await listImportRows(id, { limit: 50, cursor, state });
    approvals = await listApprovals({ importId: id, limit: 1 });
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

  const pendingImport = summary.status === "validated";
  const latestApproval = approvals.items[0] ?? null;

  return (
    <section className="space-y-6">
      <div>
        <Link
          className="text-sm text-blue-700 hover:underline"
          href={`/layers/${summary.layer_id}/imports`}
        >
          ← Imports
        </Link>
        <h1 className="text-xl font-semibold">{summary.filename}</h1>
        <p className="text-sm text-gray-600">
          {summary.format.toUpperCase()} · {summary.status} · created {formatDate(summary.created_at)}
          {summary.committed_at && ` · committed ${formatDate(summary.committed_at)}`}
          {summary.cancelled_at && ` · cancelled ${formatDate(summary.cancelled_at)}`}
        </p>
        {(summary.source_name || summary.source_url) && (
          <p className="text-sm text-gray-600">
            Source: {summary.source_name ?? "—"}
            {summary.source_url && (
              <>
                {" · "}
                <a
                  className="text-blue-700 hover:underline"
                  href={summary.source_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {summary.source_url}
                </a>
              </>
            )}
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded border bg-white p-4 text-sm md:grid-cols-5">
        <div>
          <dt className="text-gray-500">Rows</dt>
          <dd>{summary.row_count}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Valid</dt>
          <dd>{summary.valid_count}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Invalid</dt>
          <dd>{summary.invalid_count}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Candidates</dt>
          <dd>{summary.candidate_count}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Resolved</dt>
          <dd>
            {summary.resolved_candidate_count} / {summary.candidate_count}
          </dd>
        </div>
      </dl>

      <div className="rounded border bg-white p-4 text-sm">
        <h2 className="text-base font-medium">Approval</h2>
        {latestApproval ? (
          <div className="mt-1 space-y-1">
            <p>
              <span className="font-medium">{approvalStateLabel(latestApproval.state)}</span>
              {" · "}
              <Link
                className="text-blue-700 hover:underline"
                href={`/approvals/${latestApproval.id}`}
              >
                Review approval
              </Link>
            </p>
            {approvalStateExplanation(latestApproval.state) && (
              <p className="text-gray-600">{approvalStateExplanation(latestApproval.state)}</p>
            )}
            <p className="text-gray-600">
              Requested by {latestApproval.requester} · expires{" "}
              {formatDate(latestApproval.expires_at)}
            </p>
          </div>
        ) : (
          <p className="mt-1 text-gray-600">
            No approval requested. The curator can request publication approval.
          </p>
        )}
      </div>

      {pendingImport && <ImportActions summary={summary} />}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-lg font-medium">Rows</h2>
          {FILTERS.map((filter) => (
            <Link
              key={filter.value}
              href={
                filter.value
                  ? `/imports/${summary.id}?state=${filter.value}`
                  : `/imports/${summary.id}`
              }
              className={`rounded border px-2 py-1 text-xs ${
                (state ?? "") === filter.value ? "bg-gray-800 text-white" : "hover:bg-gray-100"
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>

        {rows.items.length === 0 ? (
          <p className="text-sm text-gray-600">No rows for this filter.</p>
        ) : (
          <div className="space-y-3">
            {rows.items.map((row) => (
              <article key={row.row_number} className="rounded border bg-white p-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-medium">
                    Row {row.row_number}
                    {row.external_id && (
                      <span className="ml-2 font-mono text-xs text-gray-600">
                        {row.external_id}
                      </span>
                    )}
                  </h3>
                  <span className="font-mono text-xs text-gray-600">
                    {coordinatesLabel(row)}
                  </span>
                </div>

                {row.validation_error && (
                  <p className="mt-2 rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-800">
                    {row.validation_error}
                  </p>
                )}

                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Properties</p>
                    <pre className="mt-1 overflow-auto rounded bg-gray-50 p-2 text-xs">
                      {JSON.stringify(row.properties, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Duplicate candidates</p>
                    {row.candidate_matches.length === 0 ? (
                      <p className="mt-1 text-xs text-gray-600">None</p>
                    ) : (
                      <ul className="mt-1 space-y-2">
                        {row.candidate_matches.map((match) => (
                          <li key={match.feature_id} className="rounded border p-2 text-xs">
                            <p className="font-medium">
                              {match.summary.label ?? match.summary.external_id ?? match.feature_id}
                              {match.summary.status && (
                                <span className="ml-2 text-gray-500">{match.summary.status}</span>
                              )}
                            </p>
                            {match.summary.coordinates && (
                              <p className="font-mono text-gray-600">
                                {match.summary.coordinates[1].toFixed(5)},{" "}
                                {match.summary.coordinates[0].toFixed(5)}
                              </p>
                            )}
                            <ul className="mt-1 list-disc pl-4 text-gray-700">
                              {match.reasons.map((reason, index) => (
                                <li key={index}>{formatReason(reason)}</li>
                              ))}
                            </ul>
                            <Link
                              className="mt-1 inline-block text-blue-700 hover:underline"
                              href={`/features/${match.feature_id}`}
                            >
                              View existing feature
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                    {row.candidate_matches.length > 0 && (
                      <div className="mt-2">
                        <ImportRowResolution
                          importId={summary.id}
                          rowNumber={row.row_number}
                          resolution={row.resolution}
                          pendingImport={pendingImport}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <Pagination
          basePath={`/imports/${summary.id}`}
          params={{ state }}
          nextCursor={rows.next_cursor}
          hasCursor={Boolean(cursor)}
        />
      </div>
    </section>
  );
}
