import Link from "next/link";
import type { ReactNode } from "react";

import { ApprovalDecision } from "@/components/ApprovalDecision";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Pagination } from "@/components/Pagination";
import {
  approvalStateExplanation,
  approvalStateLabel,
  canDecideApproval,
  shortFingerprint,
} from "@/lib/approval";
import { describeError } from "@/lib/errors";
import { getApproval, listImportRows } from "@/lib/geo-api";
import { formatReason } from "@/lib/import-form";
import type { AdminImportRow, ImportApproval, Page } from "@/lib/types";

export const dynamic = "force-dynamic";

const ROW_FILTERS = [
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default async function ApprovalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cursor?: string; state?: string }>;
}) {
  const { id } = await params;
  const { cursor, state } = await searchParams;

  let approval: ImportApproval;
  let rows: Page<AdminImportRow>;
  try {
    approval = await getApproval(id);
    rows = await listImportRows(approval.import_id, { limit: 25, cursor, state });
  } catch (error) {
    return (
      <section className="space-y-4">
        <Link className="text-sm text-blue-700 hover:underline" href="/approvals">
          ← Approvals
        </Link>
        <ErrorBanner error={describeError(error)} />
      </section>
    );
  }

  const explanation = approvalStateExplanation(approval.state);
  const decidable = canDecideApproval(approval.state);

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm text-blue-700 hover:underline" href="/approvals">
          ← Approvals
        </Link>
        <h1 className="text-xl font-semibold">
          Approval {shortFingerprint(approval.id)}
        </h1>
        <p className="text-sm text-gray-600">
          {approvalStateLabel(approval.state)} · requested by {approval.requester} ·{" "}
          {formatDate(approval.requested_at)}
        </p>
      </div>

      <div className="space-y-1 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <p className="font-medium">You are approving this exact import snapshot.</p>
        <p>Any later change will invalidate this approval.</p>
        <p className="font-mono text-xs">
          Fingerprint: {shortFingerprint(approval.fingerprint)}
        </p>
        <details className="text-xs">
          <summary className="cursor-pointer">Full fingerprint</summary>
          <code className="break-all">{approval.fingerprint}</code>
        </details>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded border bg-white p-4 text-sm md:grid-cols-4">
        <Field label="Layer">
          <Link className="text-blue-700 hover:underline" href={`/layers/${approval.layer_id}`}>
            {approval.layer_name}
          </Link>
        </Field>
        <Field label="File">{approval.filename}</Field>
        <Field label="Format">{approval.format.toUpperCase()}</Field>
        <Field label="Mapping version">{approval.mapping_version || "—"}</Field>
        <Field label="Requested output">{approval.requested_status}</Field>
        <Field label="Rows">{approval.row_count}</Field>
        <Field label="Valid">{approval.valid_count}</Field>
        <Field label="Invalid">{approval.invalid_count}</Field>
        <Field label="Candidates">{approval.candidate_count}</Field>
        <Field label="Resolved candidates">{approval.resolved_candidate_count}</Field>
        <Field label="Unresolved candidates">{approval.unresolved_candidate_count}</Field>
        <Field label="Expires">{formatDate(approval.expires_at)}</Field>
        <Field label="Source">{approval.source_name ?? "—"}</Field>
        <Field label="Source URL">
          {approval.source_url ? (
            <a
              className="break-all text-blue-700 hover:underline"
              href={approval.source_url}
              rel="noreferrer"
              target="_blank"
            >
              {approval.source_url}
            </a>
          ) : (
            "—"
          )}
        </Field>
        <Field label="Approver">{approval.approver ?? "—"}</Field>
        <Field label="Decided">{formatDate(approval.approved_at)}</Field>
        {approval.rejection_reason && (
          <Field label="Rejection reason">{approval.rejection_reason}</Field>
        )}
        {approval.executor && <Field label="Executor">{approval.executor}</Field>}
        {approval.executed_at && (
          <Field label="Executed">{formatDate(approval.executed_at)}</Field>
        )}
        {approval.failure_reason && (
          <Field label="Failure">{approval.failure_reason}</Field>
        )}
      </dl>

      {decidable ? (
        <ApprovalDecision approval={approval} />
      ) : (
        explanation && (
          <p className="rounded border bg-white p-3 text-sm text-gray-700">{explanation}</p>
        )
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-lg font-medium">Snapshot rows</h2>
          {ROW_FILTERS.map((filter) => (
            <Link
              key={filter.value}
              href={
                filter.value
                  ? `/approvals/${approval.id}?state=${filter.value}`
                  : `/approvals/${approval.id}`
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

                <p className="mt-1 text-xs text-gray-600">
                  Validation: {row.validation_error ?? "valid"} · Resolution:{" "}
                  {row.resolution ?? "none"}
                </p>

                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <details>
                    <summary className="cursor-pointer text-xs font-medium text-gray-500">
                      Properties
                    </summary>
                    <pre className="mt-1 overflow-auto rounded bg-gray-50 p-2 text-xs">
                      {JSON.stringify(row.properties, null, 2)}
                    </pre>
                  </details>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Duplicate candidates</p>
                    {row.candidate_matches.length === 0 ? (
                      <p className="mt-1 text-xs text-gray-600">None</p>
                    ) : (
                      <ul className="mt-1 space-y-1 text-xs text-gray-700">
                        {row.candidate_matches.map((match) => (
                          <li key={match.feature_id}>
                            {match.summary.label ?? match.summary.external_id ?? match.feature_id}
                            <ul className="list-disc pl-4">
                              {match.reasons.map((reason, index) => (
                                <li key={index}>{formatReason(reason)}</li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <Pagination
          basePath={`/approvals/${approval.id}`}
          params={{ state }}
          nextCursor={rows.next_cursor}
          hasCursor={Boolean(cursor)}
        />
      </div>
    </section>
  );
}
