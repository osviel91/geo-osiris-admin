import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/imports/route";
import { enableProxyTrust, identityHeaders } from "@/test/identity";

function stageRequest(overrides: {
  file?: File | null;
  fields?: Record<string, string>;
  headers?: Record<string, string>;
}): Request {
  const form = new FormData();
  if (overrides.file !== null) {
    form.set(
      "file",
      overrides.file ?? new File(["lon,lat\n-3.7,40.4"], "points.csv", { type: "text/csv" }),
    );
  }
  form.set("layer_id", "layer-1");
  form.set("format", "csv");
  for (const [key, value] of Object.entries(overrides.fields ?? {})) {
    form.set(key, value);
  }
  return new Request("http://admin.test/api/imports", {
    method: "POST",
    body: form,
    headers: overrides.headers ?? identityHeaders(),
  });
}

describe("POST /api/imports upload BFF", () => {
  beforeEach(() => {
    process.env.GEO_API_URL = "http://geo.test";
    process.env.GEO_ADMIN_TOKEN = "geo-admin-token";
    enableProxyTrust();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GEO_API_URL;
    delete process.env.GEO_ADMIN_TOKEN;
    delete process.env.ADMIN_PROXY_SECRET;
  });

  it("rejects unauthenticated uploads before any Geo Hub call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(stageRequest({ headers: {} }));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects cross-origin mutations before any Geo Hub call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      stageRequest({ headers: identityHeaders({ origin: "http://evil.test" }) }),
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects oversized uploads before calling the Geo API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      stageRequest({ file: new File([new Uint8Array(5_000_001)], "big.csv") }),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { status: 413 },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the file and mapping to the Geo API with the scoped admin token", async () => {
    const summary = { id: "imp-1", row_count: 1 };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(summary), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      stageRequest({
        fields: {
          csv_mapping: JSON.stringify({
            longitude: "lon",
            latitude: "lat",
            external_id: null,
            properties: {},
          }),
          source_name: "URE Madrid repeater directory",
          source_url: "https://example.test/ure",
        },
      }),
    );

    expect(response.status).toBe(201);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe("http://geo.test/api/v1/admin/imports");
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer geo-admin-token");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.layer_id).toBe("layer-1");
    expect(body.filename).toBe("points.csv");
    expect(body.content).toContain("-3.7,40.4");
    expect(body.csv_mapping).toMatchObject({ longitude: "lon", latitude: "lat" });
    expect(body.source_name).toBe("URE Madrid repeater directory");
    expect(body.source_url).toBe("https://example.test/ure");
  });

  it("requires a file", async () => {
    const response = await POST(stageRequest({ file: null }));
    expect(response.status).toBe(400);
  });
});
