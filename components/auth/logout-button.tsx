"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  function logout() {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      // Hard navigate so middleware re-runs and bounces to /login
      window.location.href = "/login";
    });
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      title="Sign out"
      aria-label="Sign out"
      className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-900 active:bg-stone-200 disabled:opacity-50"
      style={{ touchAction: "manipulation" }}
    >
      <LogOut className="size-4" />
    </button>
  );
}
