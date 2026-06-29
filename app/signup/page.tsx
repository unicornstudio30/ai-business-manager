"use client";

import Link from "next/link";
import { useState, useTransition, FormEvent } from "react";
import { Loader2, AlertCircle, UserPlus } from "lucide-react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || "Sign-up failed");
          return;
        }
        // Hard navigate so the layout re-renders with the new auth state.
        window.location.href = "/";
      } catch (e: any) {
        setError(e?.message ?? "Sign-up failed");
      }
    });
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-stone-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-stone-900 text-white mb-3">
            <UserPlus className="size-5" />
          </div>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Create your account</h1>
          <p className="text-sm text-stone-500 mt-0.5">Join the Unicorn Studio workspace</p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-stone-200 bg-white p-6 shadow-elevation-2 flex flex-col gap-3"
        >
          <div>
            <label htmlFor="name" className="text-xs font-medium text-stone-700 mb-1.5 block">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-400"
              style={{ touchAction: "manipulation" }}
            />
          </div>

          <div>
            <label htmlFor="email" className="text-xs font-medium text-stone-700 mb-1.5 block">
              Work email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-400"
              style={{ touchAction: "manipulation" }}
            />
          </div>

          <div>
            <label htmlFor="password" className="text-xs font-medium text-stone-700 mb-1.5 block">
              Password
              <span className="ml-1 text-stone-400 font-normal">(min 8 chars)</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-400"
              style={{ touchAction: "manipulation" }}
            />
          </div>

          {error && (
            <div className="inline-flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">
              <AlertCircle className="size-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pending || !email || !password}
            className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            style={{ touchAction: "manipulation" }}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Creating account…
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="text-xs text-stone-500 text-center mt-4">
          New accounts start as <strong>Salesperson</strong> and need an owner / admin to upgrade.
          {" "}The first signup automatically becomes the workspace <strong>Owner</strong>.
        </p>
        <p className="text-xs text-stone-500 text-center mt-2">
          Already have an account?{" "}
          <Link href="/login" className="text-stone-900 font-medium underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
