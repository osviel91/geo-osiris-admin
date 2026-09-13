"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ActionError } from "@/lib/errors";

export function ImportRowResolution({
  importId,
  rowNumber,
  resolution,
  pendingImport,
}: {
  importId: string;
  rowNumber: number;
  resolution: "skip" | "import_anyway" | null;
  pendingImport: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);

  async function resolve(next: "skip" | "import_anyway") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/imports/${importId}/rows/${rowNumber}/resolution`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolution: next }),
        },
      );
      const payload = (await response.json()) as
        | { ok: true }
        | { ok: false; error: ActionError };
      if (!payload.ok) {
        setError(payload.error);
        return;
      }
      router.refresh();
    } catch {
      setError({ status: 503, message: "Resolution failed: admin server unavailable" });
    } finally {
      setBusy(false);
    }
  }

  if (!pendingImport) {
    return (
      <span className="text-xs text-gray-700">
        {resolution === "skip"
          ? "Skipped"
          : resolution === "import_anyway"
            ? "Import anyway"
            : "—"}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void resolve("skip")}
          className={`rounded border px-2 py-1 text-xs disabled:opacity-50 ${
            resolution === "skip" ? "bg-gray-800 text-white" : "hover:bg-gray-100"
          }`}
        >
          Skip incoming
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void resolve("import_anyway")}
          className={`rounded border px-2 py-1 text-xs disabled:opacity-50 ${
            resolution === "import_anyway" ? "bg-gray-800 text-white" : "hover:bg-gray-100"
          }`}
        >
          Import anyway
        </button>
      </div>
      {error && <p className="text-xs text-red-700">{error.message}</p>}
    </div>
  );
}
