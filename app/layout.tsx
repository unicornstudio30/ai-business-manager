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
      <body className="min-h-screen bg-stone-100">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <header className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
              <div className="text-sm text-stone-500">
                <span className="text-stone-900 font-semibold">Unicorn Studio</span> — Business Manager
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
