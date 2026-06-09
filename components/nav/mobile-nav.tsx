"use client";

// Mobile drawer nav — hamburger trigger + slide-in panel with the FULL nav list.
// Pairs with MobileTabBar (primary 5 routes pinned at the bottom).
//
// Implementation notes (these matter for iOS Safari):
//   - Backdrop and drawer are SIBLING fixed elements, not parent/child. Nesting
//     an absolute panel inside a fixed overlay causes the panel to collapse
//     vertically on iOS — symptom is "drawer header shows but the nav list is
//     invisible / zero height".
//   - Height uses h-[100dvh] (dynamic viewport units) so the drawer fills the
//     whole screen even when the iOS URL bar collapses/expands. h-screen alone
//     is wrong on Safari mobile.
//   - 44×44px minimum touch targets per WCAG / Apple HIG.
//   - touch-action: manipulation kills the 300ms tap delay.
//   - Backdrop tap, link tap, route change, and Escape all close the drawer.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav-items";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change (Link inside the drawer triggers this)
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
      {/* Hamburger trigger — visible only below lg. 44×44 touch target. */}
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

      {/* Backdrop — separate fixed sibling. Hidden when closed. */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden={!open}
        className={`lg:hidden fixed inset-0 z-40 bg-stone-900/50 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ touchAction: "manipulation" }}
      />

      {/* Drawer panel — separate fixed sibling, NOT nested in backdrop.
          h-[100dvh] keeps full height correct on iOS Safari when the URL bar
          appears/disappears. -translate-x-full slides off-screen when closed. */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        aria-hidden={!open}
        className={`lg:hidden fixed top-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col bg-stone-50 border-r border-stone-200 shadow-elevation-3 transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          height: "100dvh",
          // Fallback for browsers without dvh support — uses inline calc.
          // Tailwind v3 doesn't have dvh utility classes, hence the inline style.
        }}
      >
        {/* Drawer header */}
        <div
          className="flex items-start justify-between px-4 py-4 border-b border-stone-200 flex-shrink-0"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <div className="min-w-0">
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

        {/* Nav list — scrollable, 44px touch targets */}
        <nav
          className="flex-1 min-h-0 overflow-y-auto px-3 py-3 flex flex-col gap-1"
          style={{ WebkitOverflowScrolling: "touch" }}
          aria-label="Full navigation"
        >
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
          {/* Spacer so the last item clears the iOS home indicator + tab bar */}
          <div style={{ height: "calc(env(safe-area-inset-bottom) + 1rem)" }} />
        </nav>
      </aside>
    </>
  );
}
