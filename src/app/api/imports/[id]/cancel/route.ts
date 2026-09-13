import { cancelImport } from "@/lib/geo-api";
import { errorResponse, okResponse } from "@/lib/http";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  try {
    await cancelImport(id);
    return okResponse({ id, status: "cancelled" });
  } catch (error) {
    return errorResponse(error);
  }
}
