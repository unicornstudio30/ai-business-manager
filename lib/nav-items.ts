// Single source of truth for the sidebar / mobile-nav item list.
// Imported by both components/nav/sidebar.tsx (desktop) and
// components/nav/mobile-nav.tsx (mobile drawer).

import {
  Home,
  Users,
  Flame,
  MessageSquare,
  UserPlus,
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
  History as HistoryIcon,
  Star,
  Settings as SettingsIcon,
  Shield,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "./db/schema";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // If set, item is only shown when the current user's role meets this bar.
  // Mirrors ROLE_RANK in lib/db/schema.ts.
  minRole?: UserRole;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/contacts", label: "CRM", icon: Users },
  { href: "/connect", label: "Connect", icon: UserPlus },
  { href: "/engagement", label: "Engage", icon: Flame },
  { href: "/dm", label: "DM", icon: MessageSquare },
  { href: "/top-50", label: "Top 50", icon: Star },
  { href: "/stuck", label: "Stuck", icon: AlertTriangle },
  { href: "/cadences", label: "Cadences", icon: Repeat2 },
  { href: "/meetings", label: "Meetings", icon: CalendarClock },
  { href: "/tracker", label: "Sales Tracker", icon: NotebookPen },
  { href: "/content", label: "Content Calendar", icon: Calendar },
  { href: "/projects", label: "Projects", icon: Briefcase },
  { href: "/audits", label: "Audits", icon: ScanSearch },
  { href: "/partners", label: "Clients", icon: Handshake },
  { href: "/networking", label: "Networking", icon: Network },
  { href: "/communities", label: "Communities", icon: Globe },
  { href: "/finance", label: "Finance", icon: DollarSign },
  { href: "/wins-losses", label: "Wins & Losses", icon: Trophy },
  { href: "/daily-sales", label: "Daily KPIs", icon: BarChart3 },
  { href: "/history", label: "History", icon: HistoryIcon },
  { href: "/admin/users", label: "Users & roles", icon: Shield, minRole: "admin" },
  { href: "/settings", label: "Settings", icon: SettingsIcon, minRole: "admin" },
];

// Filter the nav list by the current user's role.
export function visibleNavItems(role: UserRole | undefined): NavItem[] {
  const RANK: Record<UserRole, number> = { owner: 100, admin: 80, salesperson: 40, viewer: 10 };
  const myRank = role ? RANK[role] : 0;
  return NAV_ITEMS.filter((item) => !item.minRole || myRank >= RANK[item.minRole]);
}
