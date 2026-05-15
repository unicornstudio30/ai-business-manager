import Link from "next/link";
import {
  Home,
  Users,
  Flame,
  Inbox,
  AlertTriangle,
  Repeat2,
  CalendarClock,
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
  { href: "/daily-sales", label: "Daily KPIs", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:gap-1 border-r border-stone-200 bg-stone-50 p-4">
      <div className="px-2 mb-4">
        <div className="text-sm font-semibold text-stone-900">Unicorn Studio</div>
        <div className="text-xs text-stone-500">AI Business Manager</div>
      </div>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-stone-700 hover:bg-stone-200/60 hover:text-stone-900 transition-colors"
          >
            <item.icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
