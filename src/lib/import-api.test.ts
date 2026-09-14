import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  cancelImport,
  listImportRows,
  listImports,
  resolveImportRow,
} from "@/lib/geo-api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function lastCall(fetchMock: ReturnType<typeof vi.fn>): [string, RequestInit] {
  return fetchMock.mock.calls.at(-1) as [string, RequestInit];
}

describe("geo-api import client", () => {
  beforeEach(() => {
    process.env.GEO_API_URL = "http://geo.test";
    process.env.GEO_ADMIN_TOKEN = "secret-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GEO_API_URL;
    delete process.env.GEO_ADMIN_TOKEN;
  });

  it("lists imports scoped to a layer and passes the opaque cursor through", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ items: [], next_cursor: null }));
    vi.stubGlobal("fetch", fetchMock);

    const cursor = "eyJjcmVhdGVkX2F0IjogIngifQ==";
    await listImports("layer-1", { limit: 25, cursor });

    const url = new URL(String(lastCall(fetchMock)[0]));
    expect(url.pathname).toBe("/api/v1/admin/imports");
    expect(url.searchParams.get("layer_id")).toBe("layer-1");
    expect(url.searchParams.get("limit")).toBe("25");
    expect(url.searchParams.get("cursor")).toBe(cursor);
    expect((lastCall(fetchMock)[1].headers as Headers).get("Authorization")).toBe(
      "Bearer secret-token",
    );
  });

  it("passes row state filter and cursor through untouched", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ items: [], next_cursor: null }));
    vi.stubGlobal("fetch", fetchMock);

    await listImportRows("imp-1", { limit: 50, cursor: "cm93OjM=", state: "candidate" });

    const url = new URL(String(lastCall(fetchMock)[0]));
    expect(url.pathname).toBe("/api/v1/admin/imports/imp-1/rows");
    expect(url.searchParams.get("state")).toBe("candidate");
    expect(url.searchParams.get("cursor")).toBe("cm93OjM=");
  });

  it("posts the supported duplicate resolution values", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ row_number: 7, resolution: "skip" }));
    vi.stubGlobal("fetch", fetchMock);

    await resolveImportRow("imp-1", 7, "skip");

    const [url, init] = lastCall(fetchMock);
    expect(String(url)).toBe("http://geo.test/api/v1/admin/imports/imp-1/rows/7/resolution");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ resolution: "skip" });
  });

  it("cancels through the DELETE endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await cancelImport("imp-1");

    const [url, init] = lastCall(fetchMock);
    expect(String(url)).toBe("http://geo.test/api/v1/admin/imports/imp-1");
    expect(init.method).toBe("DELETE");
  });
});
