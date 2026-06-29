import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/nav/sidebar";
import { MobileNav } from "@/components/nav/mobile-nav";
import { MobileTabBar } from "@/components/nav/mobile-tab-bar";
import { SyncButton } from "@/components/sync-button";
import { QuickLog } from "@/components/quick-log";
import { ReminderBanner } from "@/components/reminder-banner";
import { LogoutButton } from "@/components/auth/logout-button";
import { getCurrentUser } from "@/lib/auth/server";
import type { UserRole } from "@/lib/db/schema";

export const metadata: Metadata = {
  title: "Unicorn Studio — AI Business Manager",
  description: "Unified CRM, content, projects, and AI cockpit for Unicorn Studio.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fafaf9",
};

const ROLE_CHIP: Record<UserRole, string> = {
  owner:       "bg-violet-100 text-violet-800 border-violet-200",
  admin:       "bg-blue-100 text-blue-800 border-blue-200",
  salesperson: "bg-emerald-100 text-emerald-800 border-emerald-200",
  viewer:      "bg-stone-100 text-stone-700 border-stone-200",
};

const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  salesperson: "Sales",
  viewer: "Viewer",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const role = (user?.role as UserRole | undefined) ?? undefined;

  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50">
        {user ? (
          <>
            <div className="flex min-h-screen">
              <Sidebar role={role} />
              <div className="flex-1 flex flex-col min-w-0">
                <ReminderBanner />
                <header className="sticky top-0 z-40 flex items-center gap-2 bg-white/85 backdrop-blur-md border-b border-stone-200/70 px-3 py-3 sm:px-6 shadow-elevation-1">
                  <MobileNav role={role} />
                  <div className="text-sm text-stone-500 min-w-0 flex-1 truncate">
                    <span className="text-stone-900 font-semibold tracking-tight">Unicorn Studio</span>
                    <span className="hidden sm:inline"> — Business Manager</span>
                  </div>
                  {role && (
                    <span
                      className={`hidden sm:inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${ROLE_CHIP[role]}`}
                      title={user.email}
                    >
                      {user.name || user.email.split("@")[0]} · {ROLE_LABEL[role]}
                    </span>
                  )}
                  <SyncButton />
                  <LogoutButton />
                </header>
                {/* Bottom padding on mobile so MobileTabBar doesn't sit on top of content. */}
                <main className="flex-1 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8 max-w-[1400px] w-full">{children}</main>
              </div>
            </div>
            <QuickLog />
            <MobileTabBar />
          </>
        ) : (
          // Unauthenticated: render the page bare (used by /login, /signup).
          <>{children}</>
        )}
      </body>
    </html>
  );
}
