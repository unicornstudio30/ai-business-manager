"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Flame,
  Inbox,
  AlertTriangle,
  Repeat2,
  CalendarClock,
  Trophy,
  NotebookPen,
  Calendar,
  Briefcase,
  ScanSearch,
  Handshake,
  Globe,
  Network,
  DollarSign,
  BarChart3,
  Settings as SettingsIcon,
} from "lucide-react";

const items = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/stuck", label: "Stuck", icon: AlertTriangle },
  { href: "/engagement", label: "Engagement", icon: Flame },
  { href: "/cadences", label: "Cadences", icon: Repeat2 },
  { href: "/meetings", label: "Meetings", icon: CalendarClock },
  { href: "/tracker", label: "Sales Tracker", icon: NotebookPen },
  { href: "/content", label: "Content Calendar", icon: Calendar },
  { href: "/projects", label: "Projects", icon: Briefcase },
  { href: "/audits", label: "Audits", icon: ScanSearch },
  { href: "/partners", label: "Partners", icon: Handshake },
  { href: "/networking", label: "Networking", icon: Network },
  { href: "/communities", label: "Communities", icon: Globe },
  { href: "/finance", label: "Finance", icon: DollarSign },
  { href: "/wins-losses", label: "Wins & Losses", icon: Trophy },
  { href: "/daily-sales", label: "Daily KPIs", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:gap-1 border-r border-stone-200 bg-stone-100/60 p-4">
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
