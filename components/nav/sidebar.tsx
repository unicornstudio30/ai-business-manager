"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav-items";

export function Sidebar() {
  const pathname = usePathname();

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
        {NAV_ITEMS.map((item) => {
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
