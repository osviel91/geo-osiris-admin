import "server-only";

import { timingSafeEqual } from "node:crypto";

import { failResponse } from "@/lib/http";

export type User = {
  userId: string;
  displayName: string;
  email: string | null;
};

export const PROXY_SECRET_HEADER = "x-proxy-secret";

// Identity is trusted only from the internal reverse proxy. The proxy strips all
// of these from the client request before injecting its own trusted values.
export const IDENTITY_HEADERS = [
  "remote-user",
  "remote-groups",
  "remote-name",
  "remote-email",
  "x-forwarded-user",
  "x-auth-request-user",
  "x-auth-request-email",
  "x-auth-request-groups",
  PROXY_SECRET_HEADER,
] as const;

function proxyTrusted(headers: Headers): boolean {
  const secret = process.env.ADMIN_PROXY_SECRET;
  if (!secret) return false;
  const provided = headers.get(PROXY_SECRET_HEADER);
  if (!provided || provided.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
}

export function userFromHeaders(headers: Headers): User | null {
  if (!proxyTrusted(headers)) return null;
  const userId = (headers.get("remote-user") ?? "").trim();
  if (!userId) return null;
  const displayName = (headers.get("remote-name") ?? "").trim() || userId;
  const email = (headers.get("remote-email") ?? "").trim() || null;
  return { userId, displayName, email };
}

export function userFromRequest(request: Request): User | null {
  return userFromHeaders(request.headers);
}

export async function getCurrentUser(): Promise<User | null> {
  const { headers } = await import("next/headers");
  return userFromHeaders(await headers());
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "UnauthorizedError";
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

// Next standalone derives request.url from the HOSTNAME/PORT env (e.g.
// 0.0.0.0:3000), not the incoming Host header, so it cannot be trusted for the
// CSRF check behind a reverse proxy. Prefer the proxy-set forwarded host, then
// the Host header, then fall back to request.url.
function requestHost(request: Request): string | null {
  const raw =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    (() => {
      try {
        return new URL(request.url).host;
      } catch {
        return null;
      }
    })();
  const host = raw?.split(",")[0].trim();
  return host || null;
}

function sameOrigin(request: Request): boolean {
  const source = request.headers.get("origin") ?? request.headers.get("referer");
  if (!source) return false;
  const host = requestHost(request);
  if (!host) return false;
  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
}

export type Authorization = { user: User } | { response: Response };

export function authorize(
  request: Request,
  options: { mutation?: boolean } = {},
): Authorization {
  const user = userFromRequest(request);
  if (!user) return { response: failResponse(401, "Authentication required") };
  if (options.mutation && !sameOrigin(request)) {
    return { response: failResponse(403, "Cross-origin request rejected") };
  }
  return { user };
}
