import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { LeafMark, Logo } from "@/components/Logo";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="leaf-wash relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="frost-grid pointer-events-none absolute inset-0 opacity-40" />
        <Logo inverted />
        <div className="relative max-w-lg space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-be-gold-soft">
            <LeafMark className="h-4 w-4" /> Private workspace
          </p>
          <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight">
            Jonathon Satchells Man-Tech progression portal page
          </h1>
          <p className="text-lg text-white/80">
            Sign in to securely view Jonathon Satchell's Man-Tech development matrix and projects
          </p>
        </div>
        <p className="relative text-sm text-white/60">For internal use only. Access is login-protected.</p>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border border-white bg-white p-8 shadow-[0_24px_80px_rgba(26,43,74,0.12)]">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-extrabold text-be-navy">Sign in</h2>
          <p className="mt-2 mb-8 text-sm text-be-navy/70">
            Jonathon Satchells Man-Tech progression portal page. Use your Birds Eye project credentials to continue.
          </p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
