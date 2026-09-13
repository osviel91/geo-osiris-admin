import { afterEach, describe, expect, it } from "vitest";

import { authEnabled, isValidSession, sessionToken } from "@/lib/session";

describe("admin session boundary", () => {
  afterEach(() => {
    delete process.env.ADMIN_UI_PASSWORD;
  });

  it("disables the login gate when no password is configured (proxy handles auth)", () => {
    delete process.env.ADMIN_UI_PASSWORD;
    expect(authEnabled()).toBe(false);
    expect(isValidSession(undefined)).toBe(true);
  });

  it("requires a matching session token when a password is configured", () => {
    process.env.ADMIN_UI_PASSWORD = "hunter2";
    expect(authEnabled()).toBe(true);
    const token = sessionToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(isValidSession(token ?? undefined)).toBe(true);
    expect(isValidSession("wrong")).toBe(false);
    expect(isValidSession(undefined)).toBe(false);
  });
});
