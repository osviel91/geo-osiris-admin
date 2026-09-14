import { authorize } from "@/lib/auth";
import { syncSource } from "@/lib/geo-api";
import { errorResponse, okResponse } from "@/lib/http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = authorize(request, { mutation: true });
  if ("response" in auth) return auth.response;

  const { id } = await params;
  try {
    return okResponse(await syncSource(id));
  } catch (error) {
    return errorResponse(error);
  }
}
