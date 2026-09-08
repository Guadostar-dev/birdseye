"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "./Logo";

export function PortalHeader({ username }: { username: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-be-ice bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/portal" className="rounded-xl focus:outline-none focus:ring-4 focus:ring-be-red/20">
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm font-medium text-be-navy/70 sm:block">{username}</span>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-be-ice px-3 py-2 text-sm font-semibold text-be-navy hover:bg-be-frost"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
