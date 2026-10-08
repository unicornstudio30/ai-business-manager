"use client";

import Link from "next/link";
import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { visibleNavItems } from "@/lib/nav-items";
import type { UserRole } from "@/lib/db/schema";

export function Sidebar({ role, hiddenHrefs = [] }: { role?: UserRole; hiddenHrefs?: string[] }) {
  const pathname = usePathname();
  const items = visibleNavItems(role, hiddenHrefs);

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
      <nav className="flex flex-col gap-0.5 overflow-y-auto min-h-0">
        {items.map((item, i) => {
          const active = isActive(item.href);
          const header = i === 0 || items[i - 1].section !== item.section;
          return (
            <Fragment key={item.href}>
            {header && item.section !== "Overview" && (
              <div className="px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                {item.section}
              </div>
            )}
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${active ? "nav-item-active" : ""}`}
            >
              <item.icon className={`size-4 ${active ? "" : "text-stone-500"}`} />
              <span>{item.label}</span>
            </Link>
            </Fragment>
          );
        })}
      </nav>
    </aside>
  );
}
