import { authorize } from "@/lib/auth";
import { decideApproval } from "@/lib/geo-api";
import { errorResponse, failResponse, okResponse } from "@/lib/http";

type DecisionBody = {
  import_id?: unknown;
  decision?: unknown;
  reason?: unknown;
};

export async function POST(request: Request): Promise<Response> {
  const auth = authorize(request, { mutation: true });
  if ("response" in auth) return auth.response;

  let body: DecisionBody;
  try {
    body = (await request.json()) as DecisionBody;
  } catch {
    return failResponse(400, "Invalid request body");
  }

  const importId = typeof body.import_id === "string" ? body.import_id : "";
  const decision = body.decision;
  const reason =
    typeof body.reason === "string" ? body.reason.slice(0, 1_000) : undefined;
  if (!importId || (decision !== "approve" && decision !== "reject")) {
    return failResponse(422, "import_id and decision are required");
  }

  try {
    const approval = await decideApproval(
      importId,
      decision,
      reason,
      auth.user.userId,
    );
    return okResponse(approval);
  } catch (error) {
    return errorResponse(error);
  }
}
