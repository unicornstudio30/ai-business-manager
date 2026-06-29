"use client";

// Admin user management table. Lets owners/admins:
//   - Change a user's role (with permission rules enforced server-side)
//   - Activate/deactivate
//   - Delete (owner only)
// "Me" badge highlights the current user; role / active controls disable
// against yourself to prevent lockout.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Shield, UserCircle2, EyeOff, Trash2, Power, AlertCircle, CheckCircle2, UserPlus } from "lucide-react";
import { AddUserModal } from "./add-user-modal";

type Role = "owner" | "admin" | "salesperson" | "viewer";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  notionPerson: string | null;
  createdAt: string | null;
  lastLoginAt: string | null;
};

const ROLE_META: Record<Role, { label: string; icon: any; chip: string }> = {
  owner:       { label: "Owner",       icon: ShieldCheck, chip: "bg-violet-100 text-violet-800 border-violet-200" },
  admin:       { label: "Admin",       icon: Shield,      chip: "bg-blue-100 text-blue-800 border-blue-200" },
  salesperson: { label: "Salesperson", icon: UserCircle2, chip: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  viewer:      { label: "Viewer",      icon: EyeOff,      chip: "bg-stone-100 text-stone-700 border-stone-200" },
};

export function UsersTable({ initial }: { initial: { me: { id: string; role: Role }; users: UserRow[] } }) {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>(initial.users);
  const me = initial.me;
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  function call(action: "role" | "active" | "delete" | "notion-person", body: any, optimistic: () => void) {
    setStatus(null);
    setBusy(body.userId);
    startTransition(async () => {
      const before = users;
      optimistic();
      try {
        const res = await fetch(`/api/admin/users/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setUsers(before);
          setStatus({ kind: "err", msg: data?.error || `HTTP ${res.status}` });
        } else {
          setStatus({ kind: "ok", msg: "Saved" });
          router.refresh();
        }
      } catch (e: any) {
        setUsers(before);
        setStatus({ kind: "err", msg: e?.message ?? "Request failed" });
      } finally {
        setBusy(null);
      }
    });
  }

  function changeRole(u: UserRow, newRole: Role) {
    if (newRole === u.role) return;
    call("role", { userId: u.id, role: newRole }, () => {
      setUsers((arr) => arr.map((x) => (x.id === u.id ? { ...x, role: newRole } : x)));
    });
  }

  function toggleActive(u: UserRow) {
    call("active", { userId: u.id, active: !u.active }, () => {
      setUsers((arr) => arr.map((x) => (x.id === u.id ? { ...x, active: !u.active } : x)));
    });
  }

  function remove(u: UserRow) {
    if (!confirm(`Delete ${u.email}? This can't be undone.`)) return;
    call("delete", { userId: u.id }, () => {
      setUsers((arr) => arr.filter((x) => x.id !== u.id));
    });
  }

  function saveNotionPerson(u: UserRow, value: string) {
    const cleaned = value.trim() || null;
    if (cleaned === u.notionPerson) return;
    call("notion-person", { userId: u.id, notionPerson: cleaned }, () => {
      setUsers((arr) => arr.map((x) => (x.id === u.id ? { ...x, notionPerson: cleaned } : x)));
    });
  }

  // Permission helpers (mirror the server-side checks for UX disabled-state)
  const canEditTarget = (t: UserRow): boolean => {
    if (t.id === me.id) return false;                        // never edit self
    if (me.role === "owner") return true;                    // owner can edit anyone else
    if (me.role === "admin") return t.role !== "owner" && t.role !== "admin";
    return false;
  };
  const canAssignOwner = me.role === "owner";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-stone-500 tabular-nums">
          {users.length} user{users.length === 1 ? "" : "s"} · {users.filter((u) => u.active).length} active
        </div>
        {(me.role === "owner" || me.role === "admin") && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800 min-h-[36px]"
          >
            <UserPlus className="size-3.5" /> Add user
          </button>
        )}
      </div>

      {status && (
        <div
          className={`inline-flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1.5 border ${
            status.kind === "ok"
              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
              : "text-red-700 bg-red-50 border-red-200"
          }`}
        >
          {status.kind === "ok" ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
          {status.msg}
        </div>
      )}

      <div className="surface overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
            <tr>
              <th className="text-left px-3 py-2">User</th>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2 hidden md:table-cell" title="Maps the user to the Notion 'Person' value on contacts. Defaults to user name if blank.">
                Notion Person
              </th>
              <th className="text-left px-3 py-2 hidden sm:table-cell">Last login</th>
              <th className="text-right px-3 py-2 w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {users.map((u) => {
              const meta = ROLE_META[u.role];
              const Icon = meta.icon;
              const editable = canEditTarget(u);
              const isMe = u.id === me.id;
              return (
                <tr key={u.id} className={u.active ? "" : "opacity-50"}>
                  <td className="px-3 py-2">
                    <div className="text-sm font-medium text-stone-900 flex items-center gap-2">
                      {u.name || u.email.split("@")[0]}
                      {isMe && (
                        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] bg-stone-900 text-white">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-500 truncate">{u.email}</div>
                  </td>
                  <td className="px-3 py-2">
                    {editable ? (
                      <select
                        value={u.role}
                        disabled={busy === u.id}
                        onChange={(e) => changeRole(u, e.target.value as Role)}
                        className={`rounded-md border border-stone-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-stone-300`}
                      >
                        {canAssignOwner && <option value="owner">Owner</option>}
                        {me.role === "owner" && <option value="admin">Admin</option>}
                        <option value="salesperson">Salesperson</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium border ${meta.chip}`}>
                        <Icon className="size-3" />
                        {meta.label}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {u.active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
                        <span className="size-1.5 rounded-full bg-emerald-500" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-stone-500">
                        <span className="size-1.5 rounded-full bg-stone-400" /> Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    <input
                      type="text"
                      defaultValue={u.notionPerson ?? ""}
                      disabled={busy === u.id || (!isMe && !editable && me.role !== "owner")}
                      onBlur={(e) => saveNotionPerson(u, e.target.value)}
                      placeholder={u.name || "—"}
                      className="w-32 rounded border border-stone-200 px-2 py-1 text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-400 disabled:bg-stone-50 disabled:opacity-60"
                    />
                  </td>
                  <td className="px-3 py-2 text-[11px] text-stone-500 hidden sm:table-cell">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1 justify-end">
                      <button
                        type="button"
                        title={u.active ? "Deactivate" : "Reactivate"}
                        disabled={!editable || busy === u.id}
                        onClick={() => toggleActive(u)}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Power className="size-3.5" />
                      </button>
                      {me.role === "owner" && !isMe && (
                        <button
                          type="button"
                          title="Delete"
                          disabled={busy === u.id}
                          onClick={() => remove(u)}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-stone-500">
        <strong>Role hierarchy:</strong> Owner manages everything. Admin manages salespeople +
        viewers. Salesperson runs outreach + sees their own leads. Viewer is read-only. Only the
        Owner can promote/demote admins or other owners.
      </p>

      {(me.role === "owner" || me.role === "admin") && (
        <AddUserModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          myRole={me.role as "owner" | "admin"}
        />
      )}
    </div>
  );
}
