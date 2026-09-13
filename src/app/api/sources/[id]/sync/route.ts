import { syncSource } from "@/lib/geo-api";
import { errorResponse, okResponse } from "@/lib/http";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  try {
    return okResponse(await syncSource(id));
  } catch (error) {
    return errorResponse(error);
  }
}
