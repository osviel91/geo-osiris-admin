import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { LoginForm } from "@/components/LoginForm";
import { SESSION_COOKIE, authEnabled, isValidSession } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Geo Hub Admin",
  description: "Administration for the OSIRIS Geo Hub",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const authed =
    !authEnabled() || isValidSession((await cookies()).get(SESSION_COOKIE)?.value);

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {authed ? (
          <div className="min-h-screen">
            <header className="border-b bg-white">
              <nav className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
                <Link href="/layers" className="font-semibold">
                  Geo Hub Admin
                </Link>
                <Link href="/layers" className="text-sm text-gray-600 hover:text-gray-900">
                  Layers
                </Link>
                <Link href="/sources" className="text-sm text-gray-600 hover:text-gray-900">
                  Sources
                </Link>
              </nav>
            </header>
            <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
          </div>
        ) : (
          <LoginForm />
        )}
      </body>
    </html>
  );
}
