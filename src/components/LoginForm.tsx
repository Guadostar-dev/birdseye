"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

export function LoginForm() {
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Could not sign in.");
        return;
      }
      const next = params.get("next") || "/portal";
      window.location.assign(next.startsWith("/") ? next : "/portal");
    } catch {
      setError("Could not reach the portal. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="username" className="mb-1.5 block text-sm font-semibold text-be-navy">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-xl border border-be-mist bg-white px-4 py-3 text-be-navy outline-none ring-be-red/30 transition focus:border-be-red focus:ring-4"
          placeholder="admin"
          required
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-be-navy">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-be-mist bg-white px-4 py-3 pr-20 text-be-navy outline-none ring-be-red/30 transition focus:border-be-red focus:ring-4"
            placeholder="••••••••"
            required
          />
          <button
            type="button"
            className="absolute inset-y-0 right-2 my-1 rounded-lg px-3 text-xs font-semibold text-be-blue hover:bg-be-frost"
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      {error ? (
        <p className="rounded-xl border border-be-red/20 bg-be-red/5 px-3 py-2 text-sm text-be-red" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-be-red px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] text-white shadow-lg shadow-be-red/25 transition hover:bg-be-red-deep disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Enter portal"}
      </button>
    </form>
  );
}
