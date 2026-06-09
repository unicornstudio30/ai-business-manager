"use client";

// Mobile navigation — hamburger trigger + slide-in drawer with the full nav list.
// Pairs with BottomTabBar (primary 5 routes always visible). This drawer covers
// every route including the secondary ones (Top 50, Stuck, Cadences, etc).
//
// UX best practices applied:
//   - 44×44px minimum touch targets (Apple/Google guidelines)
//   - touch-action: manipulation to kill the 300ms tap delay
//   - Always-mounted drawer with CSS transform transition for buttery slide-in
//   - safe-area-inset-top for iOS notch
//   - Body scroll lock while open
//   - Auto-close on link tap / backdrop tap / Escape / route change

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav-items";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change (Link navigation inside the drawer)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape key + body scroll lock while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* Hamburger trigger — visible only below md. Generous 44px touch target. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        className="lg:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-stone-700 hover:bg-stone-100 active:bg-stone-200 transition-colors"
        style={{ touchAction: "manipulation" }}
      >
        <Menu className="size-6" />
      </button>

      {/* Drawer is ALWAYS mounted so CSS transform can animate.
          pointer-events flip on open state so taps pass through when closed. */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        {/* Backdrop */}
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
          tabIndex={open ? 0 : -1}
          style={{ touchAction: "manipulation" }}
        />

        {/* Drawer panel — slides in from left */}
        <aside
          className={`absolute top-0 left-0 bottom-0 w-72 max-w-[85vw] flex flex-col bg-stone-50 border-r border-stone-200 shadow-elevation-3 transition-transform duration-250 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          {/* Header inside drawer */}
          <div className="flex items-start justify-between px-4 py-4 border-b border-stone-200">
            <div>
              <div className="text-sm font-semibold text-stone-900 tracking-tight">Unicorn Studio</div>
              <div className="text-xs text-stone-500">AI Business Manager</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 rounded-md text-stone-500 hover:bg-stone-100 active:bg-stone-200"
              style={{ touchAction: "manipulation" }}
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Nav list — scrollable, generous touch targets */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5" style={{ WebkitOverflowScrolling: "touch" }}>
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 min-h-[44px] text-sm transition-colors ${
                    active
                      ? "bg-stone-900 text-white shadow-elevation-1"
                      : "text-stone-700 hover:bg-white hover:text-stone-900 active:bg-stone-100"
                  }`}
                  style={{ touchAction: "manipulation" }}
                >
                  <item.icon className={`size-5 flex-shrink-0 ${active ? "" : "text-stone-500"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Safe-area padding at bottom for iOS home indicator */}
          <div style={{ height: "env(safe-area-inset-bottom)" }} />
        </aside>
      </div>
    </>
  );
}
