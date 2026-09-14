import { authorize } from "@/lib/auth";
import { stageImport } from "@/lib/geo-api";
import { errorResponse, failResponse, okResponse } from "@/lib/http";
import { MAX_IMPORT_BYTES } from "@/lib/import-form";
import type { CsvMapping } from "@/lib/types";

export async function POST(request: Request): Promise<Response> {
  const auth = authorize(request, { mutation: true });
  if ("response" in auth) return auth.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return failResponse(400, "Expected a multipart form upload");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return failResponse(400, "A file is required");
  }
  if (file.size > MAX_IMPORT_BYTES) {
    return failResponse(413, "File exceeds the 5 MB import limit");
  }

  const layerId = String(form.get("layer_id") ?? "").trim();
  if (!layerId) {
    return failResponse(400, "layer_id is required");
  }

  const format = String(form.get("format") ?? "").trim();
  if (format !== "csv" && format !== "geojson") {
    return failResponse(400, "format must be csv or geojson");
  }

  let csvMapping: CsvMapping | undefined;
  const rawMapping = form.get("csv_mapping");
  if (typeof rawMapping === "string" && rawMapping) {
    try {
      csvMapping = JSON.parse(rawMapping) as CsvMapping;
    } catch {
      return failResponse(400, "csv_mapping is not valid JSON");
    }
  }

  const content = await file.text();
  if (content.length > MAX_IMPORT_BYTES) {
    return failResponse(413, "File exceeds the 5 MB import limit");
  }

  const sourceName = String(form.get("source_name") ?? "").trim();
  const sourceUrl = String(form.get("source_url") ?? "").trim();

  try {
    const summary = await stageImport({
      layer_id: layerId,
      filename: file.name,
      format,
      content,
      csv_mapping: csvMapping,
      source_name: sourceName || undefined,
      source_url: sourceUrl || undefined,
    });
    return okResponse(summary, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
