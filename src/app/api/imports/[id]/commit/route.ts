import { commitImport } from "@/lib/geo-api";
import { errorResponse, failResponse, okResponse } from "@/lib/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failResponse(400, "Expected a JSON body");
  }
  const status =
    body && typeof body === "object" && "status" in body
      ? (body as { status: unknown }).status
      : null;
  if (status !== "draft" && status !== "published") {
    return failResponse(422, "status must be draft or published");
  }

  try {
    return okResponse(await commitImport(id, status));
  } catch (error) {
    return errorResponse(error);
  }
}
