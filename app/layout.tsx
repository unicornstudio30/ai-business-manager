import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/nav/sidebar";
import { SyncButton } from "@/components/sync-button";

export const metadata: Metadata = {
  title: "Unicorn Studio — AI Business Manager",
  description: "Unified CRM, content, projects, and AI cockpit for Unicorn Studio.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="sticky top-0 z-40 flex items-center justify-between bg-white/85 backdrop-blur-md border-b border-stone-200/70 px-6 py-3 shadow-elevation-1">
              <div className="text-sm text-stone-500">
                <span className="text-stone-900 font-semibold tracking-tight">Unicorn Studio</span>
                <span className="hidden sm:inline"> — Business Manager</span>
              </div>
              <SyncButton />
            </header>
            <main className="flex-1 p-6 md:p-8 max-w-[1400px] w-full">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
