"use client";

// Modal for creating a workspace user directly from the admin panel.
// Pairs with POST /api/admin/users/create. After creation, shows the
// generated password ONCE so it can be copied + shared securely.

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X, UserPlus, Loader2, AlertCircle, CheckCircle2, Copy, Check, Wand2 } from "lucide-react";

type Role = "owner" | "admin" | "salesperson" | "viewer";
type MyRole = "owner" | "admin";

export function AddUserModal({
  open,
  onClose,
  myRole,
}: {
  open: boolean;
  onClose: () => void;
  myRole: MyRole;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("salesperson");
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Set after successful create — used to render the post-create credential screen
  const [created, setCreated] = useState<{
    email: string;
    name: string;
    role: Role;
    password: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Owner can assign every role; admin can only create salesperson | viewer.
  const allowedRoles: Role[] =
    myRole === "owner"
      ? ["owner", "admin", "salesperson", "viewer"]
      : ["salesperson", "viewer"];

  function reset() {
    setEmail("");
    setName("");
    setRole("salesperson");
    setAutoGenerate(true);
    setPassword("");
    setError(null);
    setCreated(null);
    setCopied(false);
  }

  function close() {
    reset();
    onClose();
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!autoGenerate && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/users/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            name,
            role,
            ...(autoGenerate ? {} : { password }),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || `HTTP ${res.status}`);
          return;
        }
        setCreated({
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          password: data.initialPassword ?? null,
        });
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? "Create failed");
      }
    });
  }

  function copyCreds() {
    if (!created) return;
    const text = `Email: ${created.email}\nPassword: ${created.password ?? "(set by admin)"}\nRole: ${created.role}\nSign in at: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="bg-white rounded-2xl shadow-elevation-3 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <UserPlus className="size-5 text-stone-600" />
            <h2 className="text-base font-semibold text-stone-900">
              {created ? "User created" : "Add a user"}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="text-stone-400 hover:text-stone-900 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {!created ? (
          <form onSubmit={submit} className="p-5 flex flex-col gap-3">
            <div>
              <label htmlFor="add-email" className="text-xs font-medium text-stone-700 mb-1.5 block">
                Email
              </label>
              <input
                id="add-email"
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sami@unicornstudio.ai"
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-400"
              />
            </div>

            <div>
              <label htmlFor="add-name" className="text-xs font-medium text-stone-700 mb-1.5 block">
                Name <span className="text-stone-400 font-normal">(must match Notion "Person" value to enable My-leads filter)</span>
              </label>
              <input
                id="add-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sami"
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-400"
              />
            </div>

            <div>
              <label htmlFor="add-role" className="text-xs font-medium text-stone-700 mb-1.5 block">
                Role
              </label>
              <select
                id="add-role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-400"
              >
                {allowedRoles.includes("owner") && <option value="owner">Owner</option>}
                {allowedRoles.includes("admin") && <option value="admin">Admin</option>}
                <option value="salesperson">Salesperson</option>
                <option value="viewer">Viewer</option>
              </select>
              <p className="text-[11px] text-stone-500 mt-1">
                {myRole === "admin" ? "You can create Salesperson or Viewer. Owner can promote later." : "You can grant any role."}
              </p>
            </div>

            <div className="rounded-lg border border-stone-200 p-3 bg-stone-50/40">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoGenerate}
                  onChange={(e) => setAutoGenerate(e.target.checked)}
                  className="mt-0.5 rounded border-stone-300"
                />
                <div>
                  <div className="text-xs font-medium text-stone-800 inline-flex items-center gap-1">
                    <Wand2 className="size-3" /> Generate a strong password for me
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    16-char random. Shown once on the next screen so you can copy + share securely.
                  </div>
                </div>
              </label>

              {!autoGenerate && (
                <div className="mt-3">
                  <label htmlFor="add-pw" className="text-xs font-medium text-stone-700 mb-1.5 block">
                    Password <span className="text-stone-400 font-normal">(min 8 chars)</span>
                  </label>
                  <input
                    id="add-pw"
                    type="text"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars"
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-400"
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="inline-flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">
                <AlertCircle className="size-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={pending || !email}
              className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Creating…
                </>
              ) : (
                <>
                  <UserPlus className="size-4" /> Create user
                </>
              )}
            </button>
          </form>
        ) : (
          // Success screen — show credentials once for the admin to copy/share
          <div className="p-5 flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
              <CheckCircle2 className="size-4 flex-shrink-0" />
              <span>
                <strong>{created.name || created.email}</strong> created as <strong>{created.role}</strong>.
              </span>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
              <strong>⚠ This password is shown once.</strong> Copy it now and share it with the new user
              over a secure channel. They can change it after first login.
            </div>

            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 font-mono text-xs space-y-1 select-all">
              <div><span className="text-stone-500">Email:</span> {created.email}</div>
              <div>
                <span className="text-stone-500">Password:</span>{" "}
                {created.password ?? <em className="text-stone-400">(set by admin)</em>}
              </div>
              <div><span className="text-stone-500">Role:</span> {created.role}</div>
              <div><span className="text-stone-500">Sign in at:</span> /login</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyCreds}
                className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
              >
                {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                {copied ? "Copied" : "Copy credentials"}
              </button>
              <button
                type="button"
                onClick={reset}
                className="text-xs text-stone-600 hover:text-stone-900"
              >
                Add another
              </button>
              <button
                type="button"
                onClick={close}
                className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
