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
  Trophy,
  Swords,
  Hammer,
  NotebookPen,
  Calendar,
  Briefcase,
  Handshake,
  Globe,
  Network,
  DollarSign,
  BarChart3,
  History as HistoryIcon,
  Star,
  Settings as SettingsIcon,
  Shield,
  GitBranch,
  UsersRound,
  Activity,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "./db/schema";
import type { FeatureFlag } from "./feature-flags";

export type NavSection = "Overview" | "Pipeline analytics" | "Leaderboards" | "CRM" | "Outreach" | "Business" | "Admin";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  section: NavSection;
  // If set, item is only shown when the current user's role meets this bar.
  // Mirrors ROLE_RANK in lib/db/schema.ts.
  minRole?: UserRole;
  // If set, item is hidden while this feature flag is off (lib/feature-flags.ts).
  flag?: FeatureFlag;
};

// PBM is the analytics and reporting layer over the Unicorn Studio Pipeline
// app and the Notion CRM. Items are grouped by section, in this order.
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: Home, section: "Overview" },

  { href: "/funnel", label: "Funnel & conversion", icon: GitBranch, section: "Pipeline analytics" },
  { href: "/seats", label: "Seats", icon: UsersRound, section: "Pipeline analytics" },
  { href: "/stuck", label: "Stuck deals", icon: AlertTriangle, section: "Pipeline analytics" },
  { href: "/wins-losses", label: "Wins & Losses", icon: Trophy, section: "Pipeline analytics" },
  { href: "/partners", label: "Clients", icon: Handshake, section: "Pipeline analytics" },
  { href: "/daily-sales", label: "Daily KPIs", icon: BarChart3, section: "Pipeline analytics" },
  { href: "/history", label: "History", icon: HistoryIcon, section: "Pipeline analytics" },

  { href: "/sell-or-die", label: "Sell or Die", icon: DollarSign, section: "Leaderboards" },
  { href: "/market-or-die", label: "Market or Die", icon: Swords, section: "Leaderboards" },
  { href: "/build-or-die", label: "Build or Die", icon: Hammer, section: "Leaderboards" },

  { href: "/contacts", label: "Contacts", icon: Users, section: "CRM" },
  { href: "/top-50", label: "Top 50", icon: Star, section: "CRM" },

  // Moved to the Pipeline app — hidden while their flags are off.
  { href: "/connect", label: "Connect", icon: UserPlus, section: "Outreach", flag: "FOLLOW_UP_QUEUES" },
  { href: "/engagement", label: "Engage", icon: Flame, section: "Outreach", flag: "FOLLOW_UP_QUEUES" },
  { href: "/dm", label: "DM", icon: MessageSquare, section: "Outreach", flag: "INBOX" },
  { href: "/cadences", label: "Cadences", icon: Repeat2, section: "Outreach", flag: "FOLLOW_UP_QUEUES" },

  { href: "/tracker", label: "Sales Tracker", icon: NotebookPen, section: "Business" },
  { href: "/content", label: "Content Calendar", icon: Calendar, section: "Business" },
  { href: "/projects", label: "Projects", icon: Briefcase, section: "Business" },
  { href: "/finance", label: "Finance", icon: DollarSign, section: "Business" },
  { href: "/networking", label: "Networking", icon: Network, section: "Business" },
  { href: "/communities", label: "Communities", icon: Globe, section: "Business" },

  { href: "/admin/data-health", label: "Data health", icon: Activity, section: "Admin", minRole: "admin" },
  { href: "/admin/users", label: "Users & roles", icon: Shield, section: "Admin", minRole: "admin" },
  { href: "/settings", label: "Settings", icon: SettingsIcon, section: "Admin", minRole: "admin" },
];

// `hiddenHrefs` comes from the server (hiddenNavHrefs()) because flags read
// server-only env vars and the nav renders on the client.
export function visibleNavItems(role: UserRole | undefined, hiddenHrefs: string[] = []): NavItem[] {
  const RANK: Record<UserRole, number> = { owner: 100, admin: 80, salesperson: 40, viewer: 10 };
  const myRank = role ? RANK[role] : 0;
  return NAV_ITEMS.filter(
    (item) => (!item.minRole || myRank >= RANK[item.minRole]) && !hiddenHrefs.includes(item.href)
  );
}
