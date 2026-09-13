"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorBanner } from "@/components/ErrorBanner";
import type { ActionError } from "@/lib/errors";
import { syncFeedback } from "@/lib/source-form";
import type { SourceSyncResult } from "@/lib/types";

export function SyncButton({
  sourceId,
  disabled,
}: {
  sourceId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function sync() {
    if (!window.confirm("Trigger a manual sync now? This contacts the upstream provider.")) {
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/sources/${sourceId}/sync`, { method: "POST" });
      const payload = (await response.json()) as
        | { ok: true; data: SourceSyncResult }
        | { ok: false; error: ActionError };
      if (!payload.ok) {
        setError(payload.error);
        return;
      }
      const feedback = syncFeedback(payload.data);
      if (feedback.kind === "success") {
        setSuccess(feedback.message);
        router.refresh();
      } else {
        setError({ status: 0, message: feedback.message });
      }
    } catch {
      setError({ status: 503, message: "Sync failed: admin server unavailable" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded border p-3">
      <ErrorBanner error={error ?? undefined} />
      {success && (
        <p
          role="status"
          className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          {success}
        </p>
      )}
      <button
        type="button"
        onClick={() => void sync()}
        disabled={busy || disabled}
        className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Syncing…" : "Sync now"}
      </button>
      {disabled && (
        <p className="text-xs text-gray-600">
          This source is disabled, so a sync cannot be triggered.
        </p>
      )}
      <p className="text-xs text-gray-600">
        A failed sync leaves previously published features unchanged; the error is recorded
        on the source.
      </p>
    </div>
  );
}
