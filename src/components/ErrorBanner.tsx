import type { ActionError } from "@/lib/errors";

export function ErrorBanner({ error }: { error?: ActionError }) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
    >
      {error.status ? `[${error.status}] ` : ""}
      {error.message}
    </p>
  );
}
