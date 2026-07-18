// /admin/users — workspace user + role management + Notion owner mapping.

import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
import { listUsers } from "@/lib/auth/users";
import { getCurrentUser } from "@/lib/auth/server";
import { UsersTable } from "@/components/admin/users-table";
import { OwnerMappingPanel } from "@/components/admin/owner-mapping-panel";
import { getOwnerMappingReport, getUserOwnedCounts } from "@/lib/db/owner-mapping";
import type { UserRole } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?from=/admin/users");
  if (me.role !== "owner" && me.role !== "admin") redirect("/");

  const [users, mapping, ownedCounts] = await Promise.all([
    listUsers(),
    getOwnerMappingReport(),
    getUserOwnedCounts(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">Admin</div>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 flex items-center gap-2">
          <Shield className="size-7 text-stone-400" /> Users &amp; roles
        </h1>
        <p className="text-sm text-stone-500 mt-1 max-w-3xl">
          Manage who has access to the workspace. New signups default to{" "}
          <strong>Salesperson</strong> and must be promoted here to access more.
        </p>
      </div>

      <UsersTable
        initial={{
          me: { id: me.id, role: me.role as UserRole as "owner" | "admin" | "salesperson" | "viewer" },
          users: users.map((u) => {
            const bd = ownedCounts.get(u.id) ?? { cold: 0, leads: 0, clients: 0, archived: 0, total: 0 };
            return {
              id: u.id,
              email: u.email,
              name: u.name,
              role: u.role as "owner" | "admin" | "salesperson" | "viewer",
              active: !!u.active,
              notionPerson: u.notionPerson ?? null,
              ownedBreakdown: bd,
              createdAt: u.createdAt?.toISOString() ?? null,
              lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
            };
          }),
        }}
      />

      <OwnerMappingPanel
        initial={{
          users: mapping.users,
          rows: mapping.rows,
          totalContactsWithOwner: mapping.totalContactsWithOwner,
          totalContactsUnowned: mapping.totalContactsUnowned,
          mappedOwnerNames: mapping.mappedOwnerNames,
          unmappedOwnerNames: mapping.unmappedOwnerNames,
        }}
      />
    </div>
  );
}
