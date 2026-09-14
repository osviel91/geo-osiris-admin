"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorBanner } from "@/components/ErrorBanner";
import type { ActionError } from "@/lib/errors";
import { commitBlockedReason } from "@/lib/import-form";
import type { AdminImport } from "@/lib/types";

export function ImportActions({ summary }: { summary: AdminImport }) {
  const router = useRouter();
  const [error, setError] = useState<ActionError | null>(null);
  const [busy, setBusy] = useState<"cancel" | null>(null);

  const blocked = commitBlockedReason(summary);

  async function cancel() {
    if (
      !window.confirm(
        "Cancel this import? Staged rows are kept for audit and are not erased.",
      )
    ) {
      return;
    }
    setBusy("cancel");
    setError(null);
    try {
      const response = await fetch(`/api/imports/${summary.id}/cancel`, { method: "POST" });
      const payload = (await response.json()) as
        | { ok: true }
        | { ok: false; error: ActionError };
      if (!payload.ok) {
        setError(payload.error);
        return;
      }
      router.push(`/layers/${summary.layer_id}/imports`);
    } catch {
      setError({ status: 503, message: "Cancel failed: admin server unavailable" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3 rounded border p-3">
      <ErrorBanner error={error ?? undefined} />
      <p className="text-sm text-gray-700">
        Publication requires human approval. This import can be staged and reviewed here,
        but it cannot be committed from the admin.
      </p>
      {blocked ? (
        <p className="text-sm text-red-700">{blocked}</p>
      ) : (
        <p className="text-sm text-gray-600">This import is ready for review.</p>
      )}
      {summary.candidate_count > 0 && (
        <p className="text-xs text-gray-600">
          Duplicate candidates resolved: {summary.resolved_candidate_count} /{" "}
          {summary.candidate_count}
        </p>
      )}
      <button
        type="button"
        onClick={() => void cancel()}
        disabled={busy !== null}
        className="rounded border border-red-600 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
      >
        {busy === "cancel" ? "Cancelling…" : "Cancel import"}
      </button>
      <p className="text-xs text-gray-600">
        Cancellation is auditable: staged rows remain queryable after cancelling.
      </p>
    </div>
  );
}
