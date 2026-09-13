import Link from "next/link";

export function Pagination({
  basePath,
  params = {},
  nextCursor,
  hasCursor,
}: {
  basePath: string;
  params?: Record<string, string | undefined>;
  nextCursor: string | null;
  hasCursor: boolean;
}) {
  function href(cursor?: string) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
    if (cursor) query.set("cursor", cursor);
    const search = query.toString();
    return search ? `${basePath}?${search}` : basePath;
  }

  if (!nextCursor && !hasCursor) return null;

  return (
    <nav className="flex items-center gap-3 text-sm" aria-label="Pagination">
      {hasCursor && (
        <Link className="rounded border px-3 py-1 hover:bg-gray-100" href={href()}>
          ← First
        </Link>
      )}
      {nextCursor && (
        <Link
          className="rounded border px-3 py-1 hover:bg-gray-100"
          href={href(nextCursor)}
        >
          Next →
        </Link>
      )}
    </nav>
  );
}
