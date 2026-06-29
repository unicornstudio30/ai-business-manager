"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { visibleNavItems } from "@/lib/nav-items";
import type { UserRole } from "@/lib/db/schema";

export function Sidebar({ role }: { role?: UserRole }) {
  const pathname = usePathname();
  const items = visibleNavItems(role);

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:gap-1 border-r border-stone-200 bg-stone-100/60 p-4">
      <div className="px-2 mb-5">
        <div className="text-sm font-semibold text-stone-900 tracking-tight">Unicorn Studio</div>
        <div className="text-xs text-stone-500">AI Business Manager</div>
      </div>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${active ? "nav-item-active" : ""}`}
            >
              <item.icon className={`size-4 ${active ? "" : "text-stone-500"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
