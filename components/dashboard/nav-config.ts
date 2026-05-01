import {
  LayoutDashboard,
  Sun,
  CalendarDays,
  CalendarRange,
  CalendarFold,
  Wallet,
  FileBarChart2,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/overview", label: "Przegląd", icon: LayoutDashboard },
  { href: "/daily", label: "Dziś", icon: Sun },
  { href: "/weekly", label: "Tydzień", icon: CalendarDays },
  { href: "/monthly", label: "Miesiąc", icon: CalendarRange },
  { href: "/yearly", label: "Rok", icon: CalendarFold },
  { href: "/financial", label: "Finanse", icon: Wallet },
  { href: "/reports", label: "Raporty", icon: FileBarChart2 },
];
