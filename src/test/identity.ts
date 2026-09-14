export const PROXY_SECRET = "test-proxy-secret";
export const ORIGIN = "http://admin.test";

export function identityHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "x-proxy-secret": PROXY_SECRET,
    origin: ORIGIN,
    "remote-user": "user-1",
    "remote-name": "Test User",
    "remote-email": "user@example.test",
    ...extra,
  };
}

export function enableProxyTrust(): void {
  process.env.ADMIN_PROXY_SECRET = PROXY_SECRET;
}
