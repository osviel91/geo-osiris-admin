import { authorize } from "@/lib/auth";
import { resolveImportRow } from "@/lib/geo-api";
import { errorResponse, failResponse, okResponse } from "@/lib/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; rowNumber: string }> },
): Promise<Response> {
  const auth = authorize(request, { mutation: true });
  if ("response" in auth) return auth.response;

  const { id, rowNumber } = await context.params;
  const parsed = Number(rowNumber);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return failResponse(400, "row_number must be a positive integer");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failResponse(400, "Expected a JSON body");
  }
  const resolution =
    body && typeof body === "object" && "resolution" in body
      ? (body as { resolution: unknown }).resolution
      : null;
  if (resolution !== "skip" && resolution !== "import_anyway") {
    return failResponse(422, "resolution must be skip or import_anyway");
  }

  try {
    return okResponse(await resolveImportRow(id, parsed, resolution));
  } catch (error) {
    return errorResponse(error);
  }
}
