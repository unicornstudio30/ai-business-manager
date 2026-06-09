"use client";

// Mobile navigation: hamburger button + slide-in drawer. Rendered only below
// the md breakpoint (the desktop Sidebar takes over at md+). Auto-closes on:
//   - Tapping the backdrop
//   - Pressing Escape
//   - Following any nav link

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav-items";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change (Link navigation inside the drawer)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape, lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* Hamburger trigger — only visible below md */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-stone-700 hover:bg-stone-100"
      >
        <Menu className="size-5" />
      </button>

      {/* Drawer + backdrop */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
          />

          {/* Panel */}
          <aside className="relative flex w-72 max-w-[85vw] flex-col gap-1 bg-stone-50 border-r border-stone-200 p-4 shadow-elevation-3 overflow-y-auto">
            <div className="flex items-start justify-between mb-5 px-2">
              <div>
                <div className="text-sm font-semibold text-stone-900 tracking-tight">Unicorn Studio</div>
                <div className="text-xs text-stone-500">AI Business Manager</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="rounded-md p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
              >
                <X className="size-5" />
              </button>
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
        </div>
      )}
    </>
  );
}
