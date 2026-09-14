import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { MockGeoApiError, cancelImportMock } = vi.hoisted(() => {
  class MockGeoApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return { MockGeoApiError, cancelImportMock: vi.fn() };
});

vi.mock("@/lib/geo-api", () => ({
  GeoApiError: MockGeoApiError,
  cancelImport: cancelImportMock,
}));

import { POST } from "@/app/api/imports/[id]/cancel/route";
import { enableProxyTrust, identityHeaders } from "@/test/identity";

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function cancelRequest(headers: Record<string, string> = identityHeaders()): Request {
  return new Request("http://admin.test/api/imports/imp-1/cancel", {
    method: "POST",
    headers,
  });
}

describe("POST /api/imports/[id]/cancel", () => {
  beforeEach(() => {
    enableProxyTrust();
  });

  afterEach(() => {
    cancelImportMock.mockReset();
    delete process.env.ADMIN_PROXY_SECRET;
  });

  it("rejects unauthenticated cancellation before calling the Geo API", async () => {
    const response = await POST(cancelRequest({}), context("imp-1"));

    expect(response.status).toBe(401);
    expect(cancelImportMock).not.toHaveBeenCalled();
  });

  it("cancels through the server-side credential when authenticated", async () => {
    cancelImportMock.mockResolvedValue(undefined);

    const response = await POST(cancelRequest(), context("imp-1"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ ok: true, data: { id: "imp-1", status: "cancelled" } });
    expect(cancelImportMock).toHaveBeenCalledWith("imp-1");
  });
});
