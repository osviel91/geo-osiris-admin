import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { listSources, syncSource } from "@/lib/geo-api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function lastCall(fetchMock: ReturnType<typeof vi.fn>): [string, RequestInit] {
  return fetchMock.mock.calls.at(-1) as [string, RequestInit];
}

describe("geo-api source client", () => {
  beforeEach(() => {
    process.env.GEO_API_URL = "http://geo.test";
    process.env.ADMIN_API_TOKEN = "secret-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GEO_API_URL;
    delete process.env.ADMIN_API_TOKEN;
  });

  it("lists sources with the opaque cursor passed through untouched", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ items: [], next_cursor: null }));
    vi.stubGlobal("fetch", fetchMock);

    const cursor = "eyJzbHVnIjogImFlbWV0In0=";
    await listSources({ limit: 25, cursor });

    const url = new URL(String(lastCall(fetchMock)[0]));
    expect(url.pathname).toBe("/api/v1/admin/sources");
    expect(url.searchParams.get("limit")).toBe("25");
    expect(url.searchParams.get("cursor")).toBe(cursor);
    expect((lastCall(fetchMock)[1].headers as Headers).get("Authorization")).toBe(
      "Bearer secret-token",
    );
  });

  it("triggers a sync through the POST endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "s1", status: "success" }));
    vi.stubGlobal("fetch", fetchMock);

    await syncSource("s1");

    const [url, init] = lastCall(fetchMock);
    expect(String(url)).toBe("http://geo.test/api/v1/admin/sources/s1/sync");
    expect(init.method).toBe("POST");
  });
});
