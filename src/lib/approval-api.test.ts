import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { decideApproval, getApproval, listApprovals } from "@/lib/geo-api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function lastCall(fetchMock: ReturnType<typeof vi.fn>): [string, RequestInit] {
  return fetchMock.mock.calls.at(-1) as [string, RequestInit];
}

describe("geo-api approval client", () => {
  beforeEach(() => {
    process.env.GEO_API_URL = "http://geo.test";
    process.env.GEO_ADMIN_TOKEN = "admin-token";
    process.env.GEO_APPROVE_TOKEN = "approve-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GEO_API_URL;
    delete process.env.GEO_ADMIN_TOKEN;
    delete process.env.GEO_APPROVE_TOKEN;
  });

  it("lists approvals with the admin credential and filters", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ items: [], next_cursor: null }));
    vi.stubGlobal("fetch", fetchMock);

    await listApprovals({ limit: 25, state: "active", importId: "imp-1" });

    const url = new URL(String(lastCall(fetchMock)[0]));
    expect(url.pathname).toBe("/api/v1/admin/approvals");
    expect(url.searchParams.get("limit")).toBe("25");
    expect(url.searchParams.get("state")).toBe("active");
    expect(url.searchParams.get("import_id")).toBe("imp-1");
    expect((lastCall(fetchMock)[1].headers as Headers).get("Authorization")).toBe(
      "Bearer admin-token",
    );
  });

  it("reads a single approval with the admin credential", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "a1" }));
    vi.stubGlobal("fetch", fetchMock);

    await getApproval("a1");

    expect(String(lastCall(fetchMock)[0])).toBe("http://geo.test/api/v1/admin/approvals/a1");
    expect((lastCall(fetchMock)[1].headers as Headers).get("Authorization")).toBe(
      "Bearer admin-token",
    );
  });

  it("decides an approval with the approve credential and trusted identity header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "a1", state: "approved" }));
    vi.stubGlobal("fetch", fetchMock);

    await decideApproval("imp-1", "approve", undefined, "admin");

    const [url, init] = lastCall(fetchMock);
    expect(String(url)).toBe("http://geo.test/api/v1/admin/imports/imp-1/approval");
    expect(init.method).toBe("POST");
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer approve-token");
    expect(headers.get("X-Approver-Identity")).toBe("admin");
    expect(JSON.parse(String(init.body))).toEqual({ decision: "approve" });
  });

  it("fails closed when the approve credential is missing", async () => {
    delete process.env.GEO_APPROVE_TOKEN;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(decideApproval("imp-1", "reject", "nope", "admin")).rejects.toMatchObject({
      status: 500,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
