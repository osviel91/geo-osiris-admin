import { GeoApiError } from "@/lib/geo-api";

export function okResponse(data: unknown, status = 200): Response {
  return Response.json({ ok: true, data }, { status });
}

export function failResponse(status: number, message: string): Response {
  return Response.json({ ok: false, error: { status, message } }, { status });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof GeoApiError) {
    return failResponse(error.status, error.message);
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  return failResponse(500, message);
}
