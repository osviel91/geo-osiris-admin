import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { authorize, userFromRequest } from "@/lib/auth";
import { identityHeaders, PROXY_SECRET } from "@/test/identity";

function request(headers: Record<string, string>): Request {
  return new Request("http://admin.test/api/x", { method: "POST", headers });
}

describe("proxy identity trust boundary", () => {
  beforeEach(() => {
    process.env.ADMIN_PROXY_SECRET = PROXY_SECRET;
  });

  afterEach(() => {
    delete process.env.ADMIN_PROXY_SECRET;
  });

  it("accepts identity injected by the trusted proxy", () => {
    expect(userFromRequest(request(identityHeaders()))).toEqual({
      userId: "user-1",
      displayName: "Test User",
      email: "user@example.test",
    });
  });

  it("rejects identity when the proxy secret is absent", () => {
    const headers = identityHeaders();
    delete headers["x-proxy-secret"];
    expect(userFromRequest(request(headers))).toBeNull();
  });

  it("rejects identity when the proxy secret is wrong", () => {
    expect(
      userFromRequest(request(identityHeaders({ "x-proxy-secret": "wrong" }))),
    ).toBeNull();
  });

  it("rejects forged identity headers when no proxy secret is configured", () => {
    delete process.env.ADMIN_PROXY_SECRET;
    expect(userFromRequest(request(identityHeaders()))).toBeNull();
  });

  it("ignores spoofed forwarded and auth-request identity headers", () => {
    const user = userFromRequest(
      request(
        identityHeaders({
          "x-forwarded-user": "attacker",
          "x-auth-request-user": "attacker",
          "remote-user": "user-1",
        }),
      ),
    );
    expect(user?.userId).toBe("user-1");
  });

  it("rejects a trusted proxy request with no user", () => {
    const headers = identityHeaders();
    delete headers["remote-user"];
    expect(userFromRequest(request(headers))).toBeNull();
  });

  it("falls back to the user id for display name and omits a missing email", () => {
    const headers = identityHeaders();
    delete headers["remote-name"];
    delete headers["remote-email"];
    expect(userFromRequest(request(headers))).toEqual({
      userId: "user-1",
      displayName: "user-1",
      email: null,
    });
  });

  it("returns 401 for unauthenticated requests", () => {
    const result = authorize(request({}), { mutation: true });
    expect("response" in result).toBe(true);
    if ("response" in result) expect(result.response.status).toBe(401);
  });

  it("allows same-origin mutations", () => {
    expect("user" in authorize(request(identityHeaders()), { mutation: true })).toBe(true);
  });

  it("uses the proxy-forwarded host for the CSRF check when request.url is internal", () => {
    const internal = new Request("http://0.0.0.0:3000/api/x", {
      method: "POST",
      headers: identityHeaders({
        origin: "https://geo-admin.osiris.home.arpa",
        "x-forwarded-host": "geo-admin.osiris.home.arpa",
      }),
    });
    expect("user" in authorize(internal, { mutation: true })).toBe(true);
  });

  it("uses the Host header for the CSRF check when no forwarded host is present", () => {
    const internal = new Request("http://0.0.0.0:3000/api/x", {
      method: "POST",
      headers: identityHeaders({
        origin: "https://geo-admin.osiris.home.arpa",
        host: "geo-admin.osiris.home.arpa",
      }),
    });
    expect("user" in authorize(internal, { mutation: true })).toBe(true);
  });

  it("still rejects a cross-origin mutation behind the proxy", () => {
    const internal = new Request("http://0.0.0.0:3000/api/x", {
      method: "POST",
      headers: identityHeaders({
        origin: "https://evil.test",
        "x-forwarded-host": "geo-admin.osiris.home.arpa",
      }),
    });
    const result = authorize(internal, { mutation: true });
    expect("response" in result).toBe(true);
    if ("response" in result) expect(result.response.status).toBe(403);
  });

  it("rejects cross-origin mutations", () => {
    const result = authorize(
      request(identityHeaders({ origin: "http://evil.test" })),
      { mutation: true },
    );
    expect("response" in result).toBe(true);
    if ("response" in result) expect(result.response.status).toBe(403);
  });

  it("rejects mutations with no origin or referer", () => {
    const headers = identityHeaders();
    delete headers.origin;
    const result = authorize(request(headers), { mutation: true });
    expect("response" in result).toBe(true);
    if ("response" in result) expect(result.response.status).toBe(403);
  });

  it("accepts a same-origin referer when the origin is absent", () => {
    const headers = identityHeaders();
    delete headers.origin;
    headers.referer = "http://admin.test/layers";
    expect("user" in authorize(request(headers), { mutation: true })).toBe(true);
  });

  it("does not require an origin for non-mutating requests", () => {
    const headers = identityHeaders();
    delete headers.origin;
    expect("user" in authorize(request(headers))).toBe(true);
  });
});
