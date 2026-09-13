import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "geo_admin_session";

export function authEnabled(): boolean {
  return Boolean(process.env.ADMIN_UI_PASSWORD);
}

export function sessionToken(): string | null {
  const password = process.env.ADMIN_UI_PASSWORD;
  if (!password) return null;
  return createHash("sha256").update(password).digest("hex");
}

export function isValidSession(value: string | undefined): boolean {
  const expected = sessionToken();
  if (!expected) return true;
  if (!value || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
