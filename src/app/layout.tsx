import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Geo Hub Admin",
  description: "Administration for the OSIRIS Geo Hub",
};

const PORTAL_URL = process.env.AUTHELIA_PORTAL_URL ?? "";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {user ? (
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
                <Link href="/approvals" className="text-sm text-gray-600 hover:text-gray-900">
                  Approvals
                </Link>
                <span className="ml-auto text-sm text-gray-600">
                  {user.displayName}
                  {" · "}
                  <a href={PORTAL_URL || "/"} className="hover:text-gray-900">
                    Sign out
                  </a>
                </span>
              </nav>
            </header>
            <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
          </div>
        ) : (
          <main className="mx-auto mt-24 max-w-md space-y-2 p-6">
            <h1 className="text-xl font-semibold">Authentication required</h1>
            <p className="text-sm text-gray-600">
              Sign in through the Geo Hub portal to use the admin.
            </p>
          </main>
        )}
      </body>
    </html>
  );
}
