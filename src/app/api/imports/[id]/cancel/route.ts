import { authorize } from "@/lib/auth";
import { cancelImport } from "@/lib/geo-api";
import { errorResponse, okResponse } from "@/lib/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = authorize(request, { mutation: true });
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  try {
    await cancelImport(id);
    return okResponse({ id, status: "cancelled" });
  } catch (error) {
    return errorResponse(error);
  }
}
