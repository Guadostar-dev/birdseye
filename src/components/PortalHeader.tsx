"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./Logo";

export function PortalHeader({ username }: { username: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const projectsActive = pathname === "/portal" || pathname.startsWith("/portal/projects");
  const matrixActive = pathname.startsWith("/portal/matrix");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-be-ice bg-white/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <Link href="/portal" className="rounded-xl focus:outline-none focus:ring-4 focus:ring-be-red/20">
          <Logo />
        </Link>
        <nav className="flex items-center rounded-2xl bg-be-frost p-1">
          <Tab href="/portal" active={projectsActive}>
            Projects
          </Tab>
          <Tab href="/portal/matrix" active={matrixActive}>
            Man-Tech Matrix
          </Tab>
        </nav>
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

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-xl px-4 py-2 text-sm font-bold ${
        active ? "bg-white text-be-red shadow-sm" : "text-be-navy/70 hover:text-be-navy"
      }`}
    >
      {children}
    </Link>
  );
}
