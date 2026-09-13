"use client";

import { useActionState } from "react";

import { archiveFeatureAction } from "@/app/actions";
import { ErrorBanner } from "@/components/ErrorBanner";

export function ArchiveButton({
  featureId,
  layerId,
}: {
  featureId: string;
  layerId: string;
}) {
  const [state, formAction, pending] = useActionState(archiveFeatureAction, null);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="featureId" value={featureId} />
      <input type="hidden" name="layerId" value={layerId} />
      <ErrorBanner error={state?.error} />
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-red-400 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "Archiving…" : "Archive feature"}
      </button>
    </form>
  );
}
