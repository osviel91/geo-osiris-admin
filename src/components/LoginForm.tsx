"use client";

import { useActionState } from "react";

import { loginAction } from "@/app/actions";
import { ErrorBanner } from "@/components/ErrorBanner";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null);
  return (
    <main className="mx-auto mt-24 max-w-sm space-y-4 p-6">
      <h1 className="text-xl font-semibold">Geo Hub Admin</h1>
      <p className="text-sm text-gray-600">
        Sign in to continue. In production this app normally sits behind an
        authenticated reverse proxy.
      </p>
      <form action={formAction} className="space-y-3">
        <ErrorBanner error={state?.error} />
        <label className="block text-sm">
          Password
          <input
            type="password"
            name="password"
            required
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
