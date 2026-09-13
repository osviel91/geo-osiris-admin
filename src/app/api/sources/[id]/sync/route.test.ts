import { afterEach, describe, expect, it, vi } from "vitest";

const { MockGeoApiError, syncSourceMock } = vi.hoisted(() => {
  class MockGeoApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return { MockGeoApiError, syncSourceMock: vi.fn() };
});

vi.mock("@/lib/geo-api", () => ({
  GeoApiError: MockGeoApiError,
  syncSource: syncSourceMock,
}));

import { POST } from "@/app/api/sources/[id]/sync/route";

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/sources/[id]/sync", () => {
  afterEach(() => {
    syncSourceMock.mockReset();
  });

  it("returns the sync result on success", async () => {
    syncSourceMock.mockResolvedValue({
      id: "s1",
      layer_id: "l1",
      slug: "aemet-stations",
      adapter: "aemet_stations",
      dataset_id: "aemet",
      status: "success",
      last_attempt_at: "2026-09-13T00:00:00Z",
      last_success_at: "2026-09-13T00:00:00Z",
      last_error: null,
    });

    const response = await POST(
      new Request("http://localhost/api/sources/s1/sync", { method: "POST" }),
      context("s1"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.status).toBe("success");
    expect(syncSourceMock).toHaveBeenCalledWith("s1");
  });

  it("returns a failed sync result without throwing so the UI can preserve data", async () => {
    syncSourceMock.mockResolvedValue({
      id: "s1",
      layer_id: "l1",
      slug: "aemet-stations",
      adapter: "aemet_stations",
      dataset_id: "aemet",
      status: "failed",
      last_attempt_at: "2026-09-13T00:00:00Z",
      last_success_at: "2026-09-12T00:00:00Z",
      last_error: "upstream 503",
    });

    const response = await POST(
      new Request("http://localhost/api/sources/s1/sync", { method: "POST" }),
      context("s1"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.status).toBe("failed");
    expect(payload.data.last_error).toBe("upstream 503");
  });

  it("maps a disabled-source conflict to an error response", async () => {
    syncSourceMock.mockRejectedValue(
      new MockGeoApiError(409, "External source is disabled"),
    );

    const response = await POST(
      new Request("http://localhost/api/sources/s1/sync", { method: "POST" }),
      context("s1"),
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.ok).toBe(false);
    expect(payload.error.message).toContain("disabled");
  });
});
