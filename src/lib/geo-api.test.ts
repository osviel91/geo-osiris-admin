import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GeoApiError, geoFetch, listFeatures, listLayers } from "@/lib/geo-api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("geo-api server client", () => {
  beforeEach(() => {
    process.env.GEO_API_URL = "http://geo.test";
    process.env.ADMIN_API_TOKEN = "secret-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GEO_API_URL;
    delete process.env.ADMIN_API_TOKEN;
  });

  it("sends the admin token as a server-side Authorization header", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ items: [], next_cursor: null }));
    vi.stubGlobal("fetch", fetchMock);

    await listLayers();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe("http://geo.test/api/v1/admin/layers?limit=100");
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer secret-token");
  });

  it("passes opaque cursors through without decoding or rebuilding them", async () => {
    const cursor = "eyJyb3dfbnVtYmVyIjogNX0=+/";
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ items: [], next_cursor: "next==" }));
    vi.stubGlobal("fetch", fetchMock);

    const page = await listFeatures("layer-1", { cursor, status: "published" });

    const url = new URL(String((fetchMock.mock.calls[0] as [string])[0]));
    expect(url.searchParams.get("cursor")).toBe(cursor);
    expect(url.searchParams.get("status")).toBe("published");
    expect(page.next_cursor).toBe("next==");
  });

  it("surfaces 401 as a GeoApiError with status 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "Invalid token" }, 401)),
    );
    await expect(listLayers()).rejects.toMatchObject({ status: 401 });
  });

  it("formats 422 validation arrays into a readable message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          { detail: [{ loc: ["body", "slug"], msg: "String should match pattern" }] },
          422,
        ),
      ),
    );
    const error = await listLayers().catch((issue: unknown) => issue);
    expect(error).toBeInstanceOf(GeoApiError);
    expect((error as GeoApiError).status).toBe(422);
    expect((error as GeoApiError).message).toContain("body.slug");
    expect((error as GeoApiError).message).toContain("String should match pattern");
  });

  it("maps network failures to 503", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    await expect(geoFetch("/api/v1/admin/layers")).rejects.toMatchObject({
      status: 503,
    });
  });

  it("fails closed when server configuration is missing", async () => {
    delete process.env.ADMIN_API_TOKEN;
    await expect(listLayers()).rejects.toMatchObject({ status: 500 });
  });
});
