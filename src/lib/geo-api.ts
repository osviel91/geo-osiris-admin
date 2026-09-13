import "server-only";

import type {
  AdminFeature,
  AdminImport,
  AdminImportRow,
  AdminLayer,
  AdminSource,
  CsvMapping,
  FeatureWrite,
  ImportSummary,
  LayerCreate,
  LayerUpdate,
  Page,
  SourceSyncResult,
} from "@/lib/types";

const TIMEOUT_MS = 10_000;

export class GeoApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "GeoApiError";
    this.status = status;
    this.detail = detail;
  }
}

function serverConfig(): { baseUrl: string; token: string } {
  const baseUrl = process.env.GEO_API_URL;
  const token = process.env.ADMIN_API_TOKEN;
  if (!baseUrl) {
    throw new GeoApiError(500, "GEO_API_URL is not configured on the server");
  }
  if (!token) {
    throw new GeoApiError(500, "ADMIN_API_TOKEN is not configured on the server");
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), token };
}

function formatDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((entry) => {
        if (entry && typeof entry === "object" && "msg" in entry) {
          const loc = "loc" in entry && Array.isArray(entry.loc) ? entry.loc.join(".") : "";
          return `${loc ? `${loc}: ` : ""}${String((entry as { msg: unknown }).msg)}`;
        }
        return JSON.stringify(entry);
      })
      .join("; ");
  }
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  return "";
}

async function parseError(response: Response): Promise<GeoApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const detail =
    body && typeof body === "object" && "detail" in body
      ? (body as { detail: unknown }).detail
      : null;
  const message = formatDetail(detail) || response.statusText || "Request failed";
  return new GeoApiError(response.status, message, detail);
}

export async function geoFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { baseUrl, token } = serverConfig();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new GeoApiError(503, "Geo API is unavailable", String(error));
  }

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function pageQuery(params: { limit: number; cursor?: string | null; status?: string | null }) {
  const query = new URLSearchParams();
  query.set("limit", String(params.limit));
  if (params.cursor) query.set("cursor", params.cursor);
  if (params.status) query.set("status", params.status);
  return query.toString();
}

export function listLayers(limit = 100, cursor?: string | null): Promise<Page<AdminLayer>> {
  return geoFetch(`/api/v1/admin/layers?${pageQuery({ limit, cursor })}`);
}

export function getLayer(layerId: string): Promise<AdminLayer> {
  return geoFetch(`/api/v1/admin/layers/${layerId}`);
}

export function createLayer(body: LayerCreate): Promise<{ id: string; slug: string }> {
  return geoFetch("/api/v1/admin/layers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateLayer(layerId: string, body: LayerUpdate): Promise<AdminLayer> {
  return geoFetch(`/api/v1/admin/layers/${layerId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function listFeatures(
  layerId: string,
  options: { limit?: number; cursor?: string | null; status?: string | null } = {},
): Promise<Page<AdminFeature>> {
  const query = pageQuery({
    limit: options.limit ?? 100,
    cursor: options.cursor,
    status: options.status,
  });
  return geoFetch(`/api/v1/admin/layers/${layerId}/features?${query}`);
}

export function getFeature(featureId: string): Promise<AdminFeature> {
  return geoFetch(`/api/v1/admin/features/${featureId}`);
}

export function createFeature(
  layerId: string,
  body: FeatureWrite,
): Promise<{ id: string; layer_id: string; status: string }> {
  return geoFetch(`/api/v1/admin/layers/${layerId}/features`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateFeature(
  featureId: string,
  body: FeatureWrite,
): Promise<{ id: string; layer_id: string; status: string }> {
  return geoFetch(`/api/v1/admin/features/${featureId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function archiveFeature(featureId: string): Promise<void> {
  return geoFetch(`/api/v1/admin/features/${featureId}`, { method: "DELETE" });
}

export type StageImportBody = {
  layer_id: string;
  filename: string;
  format: "csv" | "geojson";
  content: string;
  csv_mapping?: CsvMapping;
  source_name?: string;
  source_url?: string;
};

export function stageImport(body: StageImportBody): Promise<ImportSummary> {
  return geoFetch("/api/v1/admin/imports", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listImports(
  layerId: string,
  options: { limit?: number; cursor?: string | null } = {},
): Promise<Page<AdminImport>> {
  const query = new URLSearchParams();
  query.set("limit", String(options.limit ?? 100));
  query.set("layer_id", layerId);
  if (options.cursor) query.set("cursor", options.cursor);
  return geoFetch(`/api/v1/admin/imports?${query.toString()}`);
}

export function getImport(importId: string): Promise<AdminImport> {
  return geoFetch(`/api/v1/admin/imports/${importId}`);
}

export function listImportRows(
  importId: string,
  options: { limit?: number; cursor?: string | null; state?: string | null } = {},
): Promise<Page<AdminImportRow>> {
  const query = new URLSearchParams();
  query.set("limit", String(options.limit ?? 100));
  if (options.cursor) query.set("cursor", options.cursor);
  if (options.state) query.set("state", options.state);
  return geoFetch(`/api/v1/admin/imports/${importId}/rows?${query.toString()}`);
}

export function resolveImportRow(
  importId: string,
  rowNumber: number,
  resolution: "skip" | "import_anyway",
): Promise<AdminImportRow> {
  return geoFetch(`/api/v1/admin/imports/${importId}/rows/${rowNumber}/resolution`, {
    method: "POST",
    body: JSON.stringify({ resolution }),
  });
}

export function commitImport(
  importId: string,
  status: "draft" | "published",
): Promise<ImportSummary> {
  return geoFetch(`/api/v1/admin/imports/${importId}/commit`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function cancelImport(importId: string): Promise<void> {
  return geoFetch(`/api/v1/admin/imports/${importId}`, { method: "DELETE" });
}

export function listSources(
  options: { limit?: number; cursor?: string | null } = {},
): Promise<Page<AdminSource>> {
  const query = new URLSearchParams();
  query.set("limit", String(options.limit ?? 100));
  if (options.cursor) query.set("cursor", options.cursor);
  return geoFetch(`/api/v1/admin/sources?${query.toString()}`);
}

export function getSource(sourceId: string): Promise<AdminSource> {
  return geoFetch(`/api/v1/admin/sources/${sourceId}`);
}

export function syncSource(sourceId: string): Promise<SourceSyncResult> {
  return geoFetch(`/api/v1/admin/sources/${sourceId}/sync`, { method: "POST" });
}
