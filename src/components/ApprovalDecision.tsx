"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorBanner } from "@/components/ErrorBanner";
import type { ActionError } from "@/lib/errors";
import type { ImportApproval } from "@/lib/types";

export function ApprovalDecision({ approval }: { approval: ImportApproval }) {
  const router = useRouter();
  const [error, setError] = useState<ActionError | null>(null);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  async function decide(decision: "approve" | "reject", decisionReason?: string) {
    setBusy(decision);
    setError(null);
    try {
      const response = await fetch("/api/approvals/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          import_id: approval.import_id,
          decision,
          reason: decisionReason,
        }),
      });
      const payload = (await response.json()) as
        | { ok: true }
        | { ok: false; error: ActionError };
      if (!payload.ok) {
        setError(payload.error);
        return;
      }
      router.refresh();
    } catch {
      setError({ status: 503, message: "Decision failed: admin server unavailable" });
    } finally {
      setBusy(null);
    }
  }

  function confirmApprove() {
    const detail = [
      `Layer: ${approval.layer_name}`,
      `Import ID: ${approval.import_id}`,
      `Rows to publish: ${approval.valid_count}`,
      `Requested output: ${approval.requested_status}`,
      "",
      "Approve this exact snapshot? This does not publish; the publisher executes it.",
    ].join("\n");
    if (window.confirm(detail)) void decide("approve");
  }

  return (
    <div className="space-y-3 rounded border p-3">
      <ErrorBanner error={error ?? undefined} />
      <p className="text-sm text-gray-700">
        Approving records your identity and marks this request approved. It does not
        publish the import.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={confirmApprove}
          disabled={busy !== null}
          className="rounded bg-green-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy === "approve" ? "Approving…" : "Approve"}
        </button>
        <button
          type="button"
          onClick={() => setRejecting((value) => !value)}
          disabled={busy !== null}
          className="rounded border border-red-600 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
      {rejecting && (
        <div className="space-y-2">
          <label className="block text-sm text-gray-700" htmlFor="reject-reason">
            Reason (optional, max 1000 characters)
          </label>
          <textarea
            id="reject-reason"
            value={reason}
            maxLength={1000}
            rows={3}
            onChange={(event) => setReason(event.target.value)}
            className="w-full rounded border p-2 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Reject this request?\nLayer: ${approval.layer_name}`)) {
                void decide("reject", reason || undefined);
              }
            }}
            disabled={busy !== null}
            className="rounded bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy === "reject" ? "Rejecting…" : "Confirm reject"}
          </button>
        </div>
      )}
    </div>
  );
}
