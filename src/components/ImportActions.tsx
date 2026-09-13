"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorBanner } from "@/components/ErrorBanner";
import type { ActionError } from "@/lib/errors";
import { commitBlockedReason } from "@/lib/import-form";
import type { AdminImport } from "@/lib/types";

export function ImportActions({ summary }: { summary: AdminImport }) {
  const router = useRouter();
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [error, setError] = useState<ActionError | null>(null);
  const [busy, setBusy] = useState<"commit" | "cancel" | null>(null);

  const blocked = commitBlockedReason(summary);
  const large = summary.row_count >= 500;

  async function commit() {
    if (large && !window.confirm(`Commit ${summary.row_count} rows as ${status}?`)) return;
    if (!large && status === "published" && !window.confirm("Publish this import?")) return;
    setBusy("commit");
    setError(null);
    try {
      const response = await fetch(`/api/imports/${summary.id}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as
        | { ok: true }
        | { ok: false; error: ActionError };
      if (!payload.ok) {
        setError(payload.error);
        return;
      }
      router.push(`/layers/${summary.layer_id}`);
    } catch {
      setError({ status: 503, message: "Commit failed: admin server unavailable" });
    } finally {
      setBusy(null);
    }
  }

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
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Commit as
          <select
            className="mt-1 block rounded border px-2 py-1"
            value={status}
            onChange={(event) => setStatus(event.target.value as "draft" | "published")}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => void commit()}
          disabled={busy !== null || blocked !== null}
          className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy === "commit" ? "Committing…" : "Commit import"}
        </button>
        <button
          type="button"
          onClick={() => void cancel()}
          disabled={busy !== null}
          className="rounded border border-red-600 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
        >
          {busy === "cancel" ? "Cancelling…" : "Cancel import"}
        </button>
      </div>
      {blocked && <p className="text-sm text-red-700">{blocked}</p>}
      {summary.candidate_count > 0 && (
        <p className="text-xs text-gray-600">
          Duplicate candidates resolved: {summary.resolved_candidate_count} /{" "}
          {summary.candidate_count}
        </p>
      )}
      <p className="text-xs text-gray-600">
        Cancellation is auditable: staged rows remain queryable after cancelling.
      </p>
    </div>
  );
}
