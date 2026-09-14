import Link from "next/link";

import { ErrorBanner } from "@/components/ErrorBanner";
import { Pagination } from "@/components/Pagination";
import { approvalStateLabel } from "@/lib/approval";
import { describeError } from "@/lib/errors";
import { listApprovals } from "@/lib/geo-api";
import type { ImportApproval, Page } from "@/lib/types";

export const dynamic = "force-dynamic";

const FILTERS = [
  { label: "Active", value: "active" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Executed", value: "executed" },
  { label: "Rejected", value: "rejected" },
  { label: "Stale", value: "stale" },
  { label: "Expired", value: "expired" },
  { label: "Failed", value: "failed" },
  { label: "All", value: "all" },
];

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; cursor?: string }>;
}) {
  const { state: stateParam, cursor } = await searchParams;
  const state = stateParam ?? "active";

  let approvals: Page<ImportApproval>;
  try {
    approvals = await listApprovals({
      limit: 25,
      cursor,
      state: state === "all" ? null : state,
    });
  } catch (error) {
    return (
      <section className="space-y-4">
        <h1 className="text-xl font-semibold">Approvals</h1>
        <ErrorBanner error={describeError(error)} />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Approvals</h1>
        <p className="text-sm text-gray-600">
          Human review of import publication requests. Approving does not publish; the
          isolated publisher executes approved imports.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={`/approvals?state=${filter.value}`}
            className={`rounded border px-2 py-1 text-xs ${
              state === filter.value ? "bg-gray-800 text-white" : "hover:bg-gray-100"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {approvals.items.length === 0 ? (
        <p className="text-sm text-gray-600">No approvals for this filter.</p>
      ) : (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2">Layer / file</th>
                <th className="px-3 py-2">Requester</th>
                <th className="px-3 py-2">Requested</th>
                <th className="px-3 py-2">Expires</th>
                <th className="px-3 py-2">Output</th>
                <th className="px-3 py-2">Rows</th>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {approvals.items.map((approval) => (
                <tr key={approval.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2">
                    <span className="font-medium">{approval.layer_name}</span>
                    <span className="block text-xs text-gray-500">
                      {approval.filename}
                    </span>
                  </td>
                  <td className="px-3 py-2">{approval.requester}</td>
                  <td className="px-3 py-2 text-xs">{formatDate(approval.requested_at)}</td>
                  <td className="px-3 py-2 text-xs">{formatDate(approval.expires_at)}</td>
                  <td className="px-3 py-2">{approval.requested_status}</td>
                  <td className="px-3 py-2">
                    {approval.row_count}
                    {approval.invalid_count > 0 && (
                      <span className="text-red-700"> · {approval.invalid_count} invalid</span>
                    )}
                    {approval.unresolved_candidate_count > 0 && (
                      <span className="text-amber-700">
                        {" "}
                        · {approval.unresolved_candidate_count} unresolved
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{approvalStateLabel(approval.state)}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      className="text-blue-700 hover:underline"
                      href={`/approvals/${approval.id}`}
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        basePath="/approvals"
        params={{ state }}
        nextCursor={approvals.next_cursor}
        hasCursor={Boolean(cursor)}
      />
    </section>
  );
}
