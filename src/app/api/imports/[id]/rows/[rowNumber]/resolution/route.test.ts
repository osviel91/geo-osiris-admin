import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { resolveImportRowMock } = vi.hoisted(() => ({ resolveImportRowMock: vi.fn() }));

vi.mock("@/lib/geo-api", () => ({
  GeoApiError: class GeoApiError extends Error {},
  resolveImportRow: resolveImportRowMock,
}));

import { POST } from "@/app/api/imports/[id]/rows/[rowNumber]/resolution/route";
import { enableProxyTrust, identityHeaders } from "@/test/identity";

function context(id: string, rowNumber: string) {
  return { params: Promise.resolve({ id, rowNumber }) };
}

function resolutionRequest(
  body: unknown,
  headers: Record<string, string> = identityHeaders(),
): Request {
  return new Request("http://admin.test/api/imports/imp-1/rows/7/resolution", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/imports/[id]/rows/[rowNumber]/resolution", () => {
  beforeEach(() => {
    enableProxyTrust();
  });

  afterEach(() => {
    resolveImportRowMock.mockReset();
    delete process.env.ADMIN_PROXY_SECRET;
  });

  it("rejects unauthenticated resolution before calling the Geo API", async () => {
    const response = await POST(
      resolutionRequest({ resolution: "skip" }, {}),
      context("imp-1", "7"),
    );

    expect(response.status).toBe(401);
    expect(resolveImportRowMock).not.toHaveBeenCalled();
  });

  it("resolves a row when authenticated", async () => {
    resolveImportRowMock.mockResolvedValue({ row_number: 7, resolution: "skip" });

    const response = await POST(
      resolutionRequest({ resolution: "skip" }),
      context("imp-1", "7"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ ok: true, data: { row_number: 7 } });
    expect(resolveImportRowMock).toHaveBeenCalledWith("imp-1", 7, "skip");
  });

  it("validates the resolution value before calling the Geo API", async () => {
    const response = await POST(
      resolutionRequest({ resolution: "nonsense" }),
      context("imp-1", "7"),
    );

    expect(response.status).toBe(422);
    expect(resolveImportRowMock).not.toHaveBeenCalled();
  });
});
