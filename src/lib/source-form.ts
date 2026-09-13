import type { AdminSource, SourceSyncResult } from "@/lib/types";

export type SourceHealth = "healthy" | "error" | "never" | "disabled";

export function sourceHealth(
  source: Pick<AdminSource, "enabled" | "status">,
): SourceHealth {
  if (!source.enabled) return "disabled";
  if (source.status === "success") return "healthy";
  if (source.status === "failed") return "error";
  return "never";
}

export const SOURCE_HEALTH_LABEL: Record<SourceHealth, string> = {
  healthy: "HEALTHY",
  error: "ERROR",
  never: "NEVER SYNCED",
  disabled: "DISABLED",
};

export function healthClassName(health: SourceHealth): string {
  switch (health) {
    case "healthy":
      return "border-green-300 bg-green-50 text-green-800";
    case "error":
      return "border-red-300 bg-red-50 text-red-800";
    case "disabled":
      return "border-amber-300 bg-amber-50 text-amber-800";
    case "never":
      return "border-gray-300 bg-gray-50 text-gray-700";
  }
}

export function layerHref(layerId: string): string {
  return `/layers/${layerId}`;
}

export type SyncFeedback = {
  kind: "success" | "error";
  message: string;
  refresh: boolean;
};

export function syncFeedback(
  result: Pick<SourceSyncResult, "status" | "last_error">,
): SyncFeedback {
  if (result.status === "success") {
    return {
      kind: "success",
      message: "Sync completed. Status and timestamps were refreshed.",
      refresh: true,
    };
  }
  return {
    kind: "error",
    message: result.last_error
      ? `Sync failed: ${result.last_error} Previously published data was left unchanged.`
      : "Sync failed. Previously published data was left unchanged.",
    refresh: false,
  };
}
