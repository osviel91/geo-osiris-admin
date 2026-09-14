import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { MockGeoApiError, decideApprovalMock } = vi.hoisted(() => {
  class MockGeoApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return { MockGeoApiError, decideApprovalMock: vi.fn() };
});

vi.mock("@/lib/geo-api", () => ({
  GeoApiError: MockGeoApiError,
  decideApproval: decideApprovalMock,
}));

import { POST } from "@/app/api/approvals/decision/route";
import { enableProxyTrust, identityHeaders } from "@/test/identity";

function decisionRequest(
  body: unknown,
  headers: Record<string, string> = identityHeaders(),
): Request {
  return new Request("http://admin.test/api/approvals/decision", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/approvals/decision", () => {
  beforeEach(() => {
    enableProxyTrust();
  });

  afterEach(() => {
    decideApprovalMock.mockReset();
    delete process.env.ADMIN_PROXY_SECRET;
  });

  it("rejects unauthenticated decisions before calling the Geo API", async () => {
    const response = await POST(decisionRequest({ import_id: "imp-1", decision: "approve" }, {}));

    expect(response.status).toBe(401);
    expect(decideApprovalMock).not.toHaveBeenCalled();
  });

  it("rejects cross-origin decisions before calling the Geo API", async () => {
    const response = await POST(
      decisionRequest(
        { import_id: "imp-1", decision: "approve" },
        { ...identityHeaders(), origin: "https://evil.test" },
      ),
    );

    expect(response.status).toBe(403);
    expect(decideApprovalMock).not.toHaveBeenCalled();
  });

  it("derives the approver identity from the session, ignoring body-supplied identity", async () => {
    decideApprovalMock.mockResolvedValue({ id: "a1", state: "approved" });

    const response = await POST(
      decisionRequest({
        import_id: "imp-1",
        decision: "approve",
        approved_by: "attacker",
        username: "attacker",
      }),
    );

    expect(response.status).toBe(200);
    expect(decideApprovalMock).toHaveBeenCalledWith("imp-1", "approve", undefined, "user-1");
  });

  it("passes a bounded rejection reason through", async () => {
    decideApprovalMock.mockResolvedValue({ id: "a1", state: "rejected" });

    const response = await POST(
      decisionRequest({ import_id: "imp-1", decision: "reject", reason: "wrong source" }),
    );

    expect(response.status).toBe(200);
    expect(decideApprovalMock).toHaveBeenCalledWith(
      "imp-1",
      "reject",
      "wrong source",
      "user-1",
    );
  });

  it("preserves backend 409 state conflicts", async () => {
    decideApprovalMock.mockRejectedValue(new MockGeoApiError(409, "Import changed after this request."));

    const response = await POST(decisionRequest({ import_id: "imp-1", decision: "approve" }));
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({ ok: false, error: { status: 409 } });
  });
});
