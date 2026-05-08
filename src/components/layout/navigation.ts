import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  ChartColumnBig,
  CreditCard,
  FileUp,
  LayoutDashboard,
  MessageSquareText,
  RefreshCw,
  Settings,
} from "lucide-react"

export interface NavigationItem {
  description: string
  href: string
  icon: LucideIcon
  label: string
  mobileLabel?: string
}

export const navItems: NavigationItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    mobileLabel: "Home",
    description: "Overview, cash flow, and monitoring.",
    icon: LayoutDashboard,
  },
  {
    href: "/ingestion",
    label: "Ingestion",
    description: "Uploads, job status, and previews.",
    icon: FileUp,
  },
  {
    href: "/transactions",
    label: "Transactions",
    mobileLabel: "Txns",
    description: "Search, filter, and inspect raw rows.",
    icon: CreditCard,
  },
  {
    href: "/analytics",
    label: "Analytics",
    mobileLabel: "Charts",
    description: "Deterministic trends and breakdowns.",
    icon: ChartColumnBig,
  },
  {
    href: "/alerts",
    label: "Alerts",
    description: "Anomalies, severity, and supporting context.",
    icon: AlertTriangle,
  },
  {
    href: "/recurring",
    label: "Recurring",
    description: "Repeat patterns and payment cadence.",
    icon: RefreshCw,
  },
  {
    href: "/ask-ai",
    label: "Ask AI",
    mobileLabel: "AI",
    description: "Natural language query workspace.",
    icon: MessageSquareText,
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Profile, mappings, and account controls.",
    icon: Settings,
  },
]

export const mobileDockItems = [
  "/dashboard",
  "/transactions",
  "/analytics",
  "/ask-ai",
].map((href) => navItems.find((item) => item.href === href)!)
