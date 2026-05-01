"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun } from "lucide-react";
import { NAV_ITEMS } from "./nav-config";
import { LogoutButton } from "./logout-button";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen lg:py-6 lg:px-4 lg:gap-1">
      <Link
        href="/overview"
        className="flex items-center gap-2 px-3 py-2 mb-4 group"
      >
        <span className="size-8 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand)]/30 flex items-center justify-center transition-shadow group-hover:shadow-[0_0_16px_var(--brand-glow)]">
          <Sun className="size-4 text-[var(--brand)]" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">
            Solax Monitor
          </span>
          <span className="text-[11px] text-muted-foreground">
            7,7 kWp · Ząbki
          </span>
        </div>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                active
                  ? "text-foreground font-medium bg-gradient-to-r from-[var(--brand-soft)] via-[var(--brand-soft)] to-transparent shadow-[inset_2px_0_0_var(--brand),0_0_20px_-8px_var(--brand-glow)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/40",
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center size-7 rounded-md transition-all",
                  active
                    ? "bg-[var(--brand)]/20 ring-1 ring-[var(--brand)]/30"
                    : "group-hover:bg-white/40",
                )}
              >
                <Icon
                  className={cn(
                    "size-4 transition-colors",
                    active && "text-[var(--brand)]",
                  )}
                  strokeWidth={active ? 2.4 : 2}
                />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <LogoutButton variant="sidebar" />
        <div className="px-3 pb-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[var(--savings)] shadow-[0_0_6px_var(--savings)] animate-pulse" />
            Pipeline aktywny
          </span>
          <br />
          Polling co 5 min
        </div>
      </div>
    </aside>
  );
}
