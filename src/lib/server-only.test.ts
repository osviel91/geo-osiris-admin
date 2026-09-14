import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("BFF token boundary", () => {
  const files = walk(SRC).filter(
    (file) => /\.(ts|tsx)$/.test(file) && !file.endsWith(".test.ts"),
  );

  it("never exposes an admin token through NEXT_PUBLIC_ variables", () => {
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/NEXT_PUBLIC_[A-Z_]*TOKEN/);
      expect(source).not.toMatch(/NEXT_PUBLIC_ADMIN/);
    }
  });

  it("keeps the Geo API client behind the server-only guard", () => {
    const source = readFileSync(join(SRC, "lib", "geo-api.ts"), "utf8");
    expect(source.split("\n")[0]).toBe('import "server-only";');
    expect(source).toContain("process.env.GEO_ADMIN_TOKEN");
  });

  it("keeps the proxy identity trust gate behind the server-only guard", () => {
    const source = readFileSync(join(SRC, "lib", "auth.ts"), "utf8");
    expect(source.split("\n")[0]).toBe('import "server-only";');
    expect(source).toContain("process.env.ADMIN_PROXY_SECRET");
  });

  it("does not reference the admin token from client components", () => {
    for (const file of files) {
      if (!file.endsWith(".tsx")) continue;
      const source = readFileSync(file, "utf8");
      const isClient = source.trimStart().startsWith('"use client"');
      if (isClient) expect(source).not.toContain("GEO_ADMIN_TOKEN");
    }
  });

  it("keeps the approval credential server-side", () => {
    const client = readFileSync(join(SRC, "lib", "geo-api.ts"), "utf8");
    expect(client).toContain("process.env.GEO_APPROVE_TOKEN");

    const route = readFileSync(
      join(SRC, "app", "api", "approvals", "decision", "route.ts"),
      "utf8",
    );
    expect(route).not.toContain("GEO_APPROVE_TOKEN");
    expect(route).toContain('from "@/lib/geo-api"');

    for (const file of files) {
      if (!file.endsWith(".tsx")) continue;
      const source = readFileSync(file, "utf8");
      const isClient = source.trimStart().startsWith('"use client"');
      if (isClient) expect(source).not.toContain("GEO_APPROVE_TOKEN");
    }
  });

  it("keeps uploads server-side: the route delegates to the guarded client", () => {
    const route = readFileSync(
      join(SRC, "app", "api", "imports", "route.ts"),
      "utf8",
    );
    expect(route).not.toContain("GEO_ADMIN_TOKEN");
    expect(route).toContain('from "@/lib/geo-api"');

    const upload = readFileSync(
      join(SRC, "components", "ImportUploadForm.tsx"),
      "utf8",
    );
    expect(upload.trimStart().startsWith('"use client"')).toBe(true);
    expect(upload).not.toContain("GEO_ADMIN_TOKEN");
    expect(upload).toContain('fetch("/api/imports"');
  });

  it("keeps source sync server-side: the route delegates to the guarded client", () => {
    const route = readFileSync(
      join(SRC, "app", "api", "sources", "[id]", "sync", "route.ts"),
      "utf8",
    );
    expect(route).not.toContain("GEO_ADMIN_TOKEN");
    expect(route).toContain('from "@/lib/geo-api"');

    const button = readFileSync(
      join(SRC, "components", "SyncButton.tsx"),
      "utf8",
    );
    expect(button.trimStart().startsWith('"use client"')).toBe(true);
    expect(button).not.toContain("GEO_ADMIN_TOKEN");
    expect(button).toContain("fetch(`/api/sources/${sourceId}/sync`");
  });
});
