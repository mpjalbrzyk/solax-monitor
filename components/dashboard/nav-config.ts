import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  CalendarFold,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/overview", label: "Przegląd", icon: LayoutDashboard },
  { href: "/daily", label: "Dziś", icon: CalendarDays },
  { href: "/monthly", label: "Miesiąc", icon: CalendarRange },
  { href: "/yearly", label: "Rok", icon: CalendarFold },
  { href: "/financial", label: "Finanse", icon: Wallet },
];
