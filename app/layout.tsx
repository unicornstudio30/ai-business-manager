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

export const metadata: Metadata = {
  title: "Unicorn Studio — AI Business Manager",
  description: "Unified CRM, content, projects, and AI cockpit for Unicorn Studio.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fafaf9",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50">
        {user ? (
          // Authenticated: render the full app chrome
          <>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1 flex flex-col min-w-0">
                <ReminderBanner />
                <header className="sticky top-0 z-40 flex items-center gap-2 bg-white/85 backdrop-blur-md border-b border-stone-200/70 px-3 py-3 sm:px-6 shadow-elevation-1">
                  <MobileNav />
                  <div className="text-sm text-stone-500 min-w-0 flex-1 truncate">
                    <span className="text-stone-900 font-semibold tracking-tight">Unicorn Studio</span>
                    <span className="hidden sm:inline"> — Business Manager</span>
                  </div>
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
          // Unauthenticated: render the page bare (used by /login).
          // No sidebar, no header, no mobile nav, no FAB — just the content.
          <>{children}</>
        )}
      </body>
    </html>
  );
}
